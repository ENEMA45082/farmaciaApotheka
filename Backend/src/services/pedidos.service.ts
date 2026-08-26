import * as pedidosRepo from '../repositories/pedidos.repository';
import * as direccionesRepo from '../repositories/direcciones.repository';
import * as perfilRepo from '../repositories/perfil.repository';
import * as pedidoHistorialRepo from '../repositories/pedidoHistorial.repository';
import * as facturasRepo from '../repositories/facturas.repository';
import * as correoArgentino from './correoArgentino.service';
import * as facturacionPedidosService from './facturacionPedidos.service';
import * as whatsappService from './whatsapp.service';
import * as productosService from './productos.service';
import * as cuponesService from './cupones.service';
import * as puntosService from './puntos.service';
import { esCantidadCuotasValida, calcularRecargoFinanciero } from '../config/cuotas';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import { validarDocumento } from '../utils/validarDocumento';
import { asegurarPropietario } from '../utils/ownership';
import { supabase } from '../config/supabase';
import {
  ESTADOS_PEDIDO,
  ESTADOS_FINALES,
  puedeTransicionar,
  esMotivoCancelacionValido,
  type EstadoPedido,
} from '../config/estadosPedido';
import type { Pedido, CrearPedidoDTO, PedidoDetalleAdmin } from '../types';
import type { ResultadoTracking } from './correoArgentino.service';

export async function crear(userId: string, dto: CrearPedidoDTO): Promise<Pedido> {
  if (!dto.items?.length) {
    throw new AppError('El pedido debe tener al menos un producto', 400, 'PEDIDO_SIN_ITEMS');
  }

  if (dto.metodo_envio === 'domicilio') {
    if (!dto.destinatario_nombre?.trim()) throw new AppError('El nombre del destinatario es obligatorio', 400, 'DESTINATARIO_NOMBRE_REQUERIDO');
    if (!dto.destinatario_dni?.trim())    throw new AppError('El DNI del destinatario es obligatorio', 400, 'DESTINATARIO_DNI_REQUERIDO');
    validarDocumento('DNI', dto.destinatario_dni);
  }

  // El precio SIEMPRE se toma del catálogo, nunca de lo que manda el cliente:
  // precio_unitario/precio_lista del DTO se ignoran por completo acá. pedido.total
  // termina siendo el monto real cobrado por tarjeta (pagos.service.ts) y la base
  // imponible de la factura AFIP — no puede depender de un valor client-controlled.
  const { itemsConfirmados, total, subtotalLista, productos } = await productosService.resolverItemsCarrito(dto.items);

  for (const item of dto.items) {
    const producto = productos.get(item.producto_id)!;
    if (producto.stock < item.cantidad) {
      throw new AppError(
        `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}`,
        400,
        'STOCK_INSUFICIENTE',
      );
    }
  }

  // Cupón (opcional, uno solo por pedido): esta es la revalidación que
  // "manda" al confirmar — corre de nuevo acá aunque ya haya pasado por
  // POST /api/cupones/validar en el preview del checkout, porque el carrito
  // pudo cambiar entre medio. Si ya no es válido (se agotó, venció, el
  // carrito bajó de la compra mínima), se rechaza el pedido entero.
  let cuponId: string | undefined;
  let descuentoCupon = 0;
  if (dto.codigo_cupon) {
    const resultado = await cuponesService.validarCupon({
      codigo: dto.codigo_cupon,
      clienteId: userId,
      itemsCarrito: dto.items.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
    });
    if (!resultado.valido) {
      throw new AppError(
        resultado.mensaje ?? `El cupón no es válido (${resultado.motivo})`,
        400,
        `CUPON_${resultado.motivo}`,
      );
    }
    cuponId = resultado.cuponId;
    descuentoCupon = resultado.descuento;
  }

  // Cuotas solo aplica con tarjeta — cualquier otro método se fuerza a 1 sin
  // recargo sin importar lo que mande el cliente (transferencia/efectivo son
  // flujos manuales, no hay financiación de por medio).
  const cuotasSolicitadas = dto.metodo_pago === 'tarjeta' ? (dto.cuotas ?? 1) : 1;
  if (!esCantidadCuotasValida(cuotasSolicitadas)) {
    throw new AppError(`Cantidad de cuotas inválida: ${cuotasSolicitadas}`, 400, 'CUOTAS_INVALIDAS');
  }
  // Recargo sobre TODO lo que se cobra por tarjeta (productos netos de cupón +
  // costo de envío) — mismo orden de operaciones que totalFinal en
  // PagarPage.tsx para que backend y frontend muestren el mismo número.
  const montoBaseTarjeta = (total - descuentoCupon) + (dto.costo_envio ?? 0);
  const recargoFinanciero = calcularRecargoFinanciero(montoBaseTarjeta, cuotasSolicitadas);

  // 'transferencia' y 'efectivo' son flujos manuales: el admin confirma el pago
  // cambiando el estado a 'Confirmado' via PATCH /api/pedidos/:id/estado
  //
  // El descuento de stock ya NO se hace acá con un loop aparte — pedidosRepo.crear
  // llama a la RPC crear_pedido_completo, que inserta el pedido, descuenta el
  // stock de cada item y registra el canje del cupón (si hay) en la MISMA
  // transacción de Postgres (ver supabase_migrations.sql, secciones 14 y 18).
  // El chequeo de stock del loop de arriba sigue sirviendo como camino feliz
  // con mensaje claro; la RPC es la garantía real ante una carrera con otro
  // pedido consumiendo el mismo stock o el mismo cupón justo en el medio.
  const pedido = await pedidosRepo.crear(
    userId, dto, itemsConfirmados, total - descuentoCupon, subtotalLista, cuponId, descuentoCupon,
    cuotasSolicitadas, recargoFinanciero,
  );

  whatsappService.notificarNuevoPedido(pedido).catch(err => console.error('[whatsapp]', err));

  return pedido;
}

export async function listar(userId: string): Promise<Pedido[]> {
  return pedidosRepo.encontrarPorUsuario(userId);
}

export async function obtenerPorId(id: string, userId: string): Promise<Pedido> {
  validarUUID(id, 'pedido');
  const pedido = await pedidosRepo.encontrarPorId(id);
  return asegurarPropietario(pedido, userId, 'Pedido');
}

export async function obtenerPorIdAdmin(id: string): Promise<PedidoDetalleAdmin> {
  validarUUID(id, 'pedido');
  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND');

  const [perfil, direccion, userResult, factura] = await Promise.all([
    perfilRepo.encontrarOCrear(pedido.user_id).catch(() => null),
    pedido.metodo_envio === 'domicilio' ? direccionesRepo.obtener(pedido.user_id) : Promise.resolve(null),
    supabase.auth.admin.getUserById(pedido.user_id).catch(() => null),
    facturasRepo.encontrarPorPedidoId(pedido.id).catch(() => null),
  ]);

  return {
    ...pedido,
    cliente: {
      email:    userResult?.data?.user?.email ?? null,
      nombre:   perfil?.nombre ?? null,
      apellido: perfil?.apellido ?? null,
      telefono: perfil?.telefono ?? null,
      dni:      perfil?.dni ?? null,
      documento_tipo: perfil?.documento_tipo ?? null,
    },
    direccion_envio: direccion,
    factura,
  };
}

export async function reintentarFactura(id: string): Promise<Pedido> {
  validarUUID(id, 'pedido');
  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND');
  await facturacionPedidosService.emitirFactura(pedido);
  return pedido;
}

export async function listarTodos(
  pagina = 1,
  limite = 20,
): Promise<{ datos: Pedido[]; total: number; pagina: number; limite: number; totalPaginas: number }> {
  const p = Math.max(1, pagina);
  const l = Math.min(100, Math.max(1, limite));
  const { datos, total } = await pedidosRepo.encontrarTodos(p, l);
  return { datos, total, pagina: p, limite: l, totalPaginas: Math.ceil(total / l) };
}

export async function cambiarEstado(id: string, estado: EstadoPedido, adminUserId: string): Promise<Pedido> {
  validarUUID(id, 'pedido');
  if (!ESTADOS_PEDIDO.includes(estado)) {
    throw new AppError(
      `Estado inválido: '${estado}'. Valores permitidos: ${ESTADOS_PEDIDO.join(', ')}`,
      400,
      'ESTADO_INVALIDO',
    );
  }

  if (estado === 'Cancelado') {
    throw new AppError('Para cancelar un pedido usá la acción de cancelación e indicá un motivo', 400, 'CANCELACION_REQUIERE_MOTIVO');
  }

  const pedidoActual = await pedidosRepo.encontrarPorId(id);
  if (!pedidoActual) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND');

  if (!puedeTransicionar(pedidoActual.estado, estado)) {
    const validos = TRANSICIONES_VALIDAS_PARA(pedidoActual.estado);
    throw new AppError(
      `No se puede pasar de '${pedidoActual.estado}' a '${estado}'. Transiciones válidas: ${validos.length ? validos.join(', ') : 'ninguna (estado final)'}`,
      400,
      'TRANSICION_INVALIDA',
    );
  }

  if (estado === 'Enviado' && pedidoActual.metodo_envio === 'retiro_farmacia') {
    throw new AppError('Los pedidos con retiro en farmacia deben pasar a "Listo para retirar", no a "Enviado"', 400, 'ENVIO_METODO_INCOMPATIBLE');
  }
  if (estado === 'ListoParaRetirar' && pedidoActual.metodo_envio !== 'retiro_farmacia') {
    throw new AppError('Solo los pedidos con retiro en farmacia pueden marcarse como "Listo para retirar"', 400, 'ENVIO_METODO_INCOMPATIBLE');
  }

  // La creación automática del envío real (vía la API oficial de Correo
  // Argentino) sigue desactivada mientras esa API está demorada. Ahora se
  // cotiza automatizando el portal web de MiCorreo (ver
  // micorreoCotizacion.service.ts), pero generar la guía real desde ahí
  // sería una automatización bastante más riesgosa (mueve plata/genera un
  // envío real) que no se hizo acá a propósito. Modo manual: el admin crea
  // el envío a mano en el courier que corresponda y carga
  // shipping_tracking_number directamente.
  await pedidosRepo.actualizarEstado(id, estado);

  await pedidoHistorialRepo.registrar({
    pedido_id: id,
    estado_anterior: pedidoActual.estado,
    estado_nuevo: estado,
    motivo: null,
    changed_by: adminUserId,
  });

  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND');

  // La factura se emite recién al entregar el pedido (nunca antes: ni al
  // confirmar el pago, ni en preparación) — regla de negocio explícita.
  // Los puntos de fidelización se acreditan con el mismo criterio: 'Entregado'
  // es estado terminal sin cancelación posible, así que nunca hay que
  // revertirlos (ver acreditar_puntos_pedido en supabase_migrations.sql,
  // sección 19). Igual que la factura, un error acá no rompe la transición
  // de estado ya confirmada.
  if (estado === 'Entregado') {
    await facturacionPedidosService.emitirFactura(pedido).catch(err => console.error('[facturacion]', err));
    await puntosService.acreditarPorPedido(pedido).catch(err => console.error('[puntos]', err));
  }

  return pedido;
}

function TRANSICIONES_VALIDAS_PARA(estado: EstadoPedido): EstadoPedido[] {
  return ESTADOS_PEDIDO.filter(e => puedeTransicionar(estado, e));
}

export async function cancelarPedido(id: string, motivo: string, adminUserId: string): Promise<Pedido> {
  validarUUID(id, 'pedido');
  if (!esMotivoCancelacionValido(motivo)) {
    throw new AppError(`Motivo inválido: '${motivo}'`, 400, 'MOTIVO_CANCELACION_INVALIDO');
  }

  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND');

  // TODO(nota-de-crédito): hoy es imposible llegar acá con pedido.estado === 'Entregado'
  // (Entregado es estado final, TRANSICIONES_VALIDAS.Entregado = []) — este guard nunca
  // deja cancelar un pedido ya facturado. Si en el futuro se habilita cancelar/devolver
  // un pedido Entregado, hay que emitir una Nota de Crédito B (CbteTipo 8) contra el CAE
  // de facturasRepo.encontrarPorPedidoId(id) ANTES de restaurar stock — no implementado.
  if (ESTADOS_FINALES.includes(pedido.estado)) {
    throw new AppError(`El pedido ya está en estado '${pedido.estado}' y no se puede cancelar`, 400, 'PEDIDO_ESTADO_FINAL');
  }

  // cancelarSinRestricciones cambia el estado y restaura el stock de todos
  // los detalles en una sola transacción (ver supabase_migrations.sql,
  // sección 14) — ya no hace falta el loop de restaurarStock() aparte.
  const actualizado = await pedidosRepo.cancelarSinRestricciones(id, motivo);
  if (!actualizado) throw new AppError('Error al cancelar el pedido', 500, 'CANCELACION_FALLIDA');

  await pedidoHistorialRepo.registrar({
    pedido_id: id,
    estado_anterior: pedido.estado,
    estado_nuevo: 'Cancelado',
    motivo,
    changed_by: adminUserId,
  });

  return actualizado;
}

export async function obtenerTracking(id: string, userId: string): Promise<ResultadoTracking> {
  const pedido = await obtenerPorId(id, userId);
  if (!pedido.shipping_tracking_number) {
    throw new AppError('Este pedido todavía no tiene un envío generado', 400, 'PEDIDO_SIN_ENVIO');
  }
  return correoArgentino.obtenerTracking(pedido.shipping_tracking_number);
}

export async function cancelar(id: string, userId: string): Promise<Pedido> {
  validarUUID(id, 'pedido');
  const pedido = await obtenerPorId(id, userId);
  if (pedido.estado !== 'PendienteDePago') {
    throw new AppError('Solo se pueden cancelar pedidos en estado pendiente de pago', 400, 'CANCELACION_ESTADO_INVALIDO');
  }
  // pedidosRepo.cancelar restaura el stock de todos los detalles en la misma
  // transacción que el cambio de estado (ver supabase_migrations.sql, sección 14).
  const cancelado = await pedidosRepo.cancelar(id, userId, 'solicitado_por_cliente');
  if (!cancelado) throw new AppError('Error al cancelar el pedido', 500, 'CANCELACION_FALLIDA');

  return cancelado;
}
