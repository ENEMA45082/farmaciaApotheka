import * as pedidosRepo from '../repositories/pedidos.repository';
import * as productosRepo from '../repositories/productos.repository';
import * as direccionesRepo from '../repositories/direcciones.repository';
import * as perfilRepo from '../repositories/perfil.repository';
import * as pedidoHistorialRepo from '../repositories/pedidoHistorial.repository';
import * as facturasRepo from '../repositories/facturas.repository';
import * as correoArgentino from './correoArgentino.service';
import * as facturacionPedidosService from './facturacionPedidos.service';
import * as whatsappService from './whatsapp.service';
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
import type { Pedido, CrearPedidoDTO, PedidoDetalleAdmin, ItemPedidoConfirmado } from '../types';
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
  const itemsConfirmados: ItemPedidoConfirmado[] = [];
  for (const item of dto.items) {
    const producto = await productosRepo.encontrarPorId(item.producto_id);
    if (!producto) {
      throw new AppError(`Producto no encontrado: ${item.nombre_producto}`, 404, 'PRODUCTO_NOT_FOUND');
    }
    if (producto.stock < item.cantidad) {
      throw new AppError(
        `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}`,
        400,
        'STOCK_INSUFICIENTE',
      );
    }
    // Promo 2x1: mutuamente excluyente con la oferta por % (ver es_2x1 en
    // AdminProductosPage.tsx, un producto 2x1 nunca tiene precio_oferta). Por
    // cada par de unidades, 1 sale gratis — la unidad suelta de una cantidad
    // impar se cobra completa. precio_unitario queda igual al de catálogo;
    // el descuento se resta aparte en el subtotal (ver supabase_migrations.sql,
    // sección 15).
    const pares     = producto.es_2x1 ? Math.floor(item.cantidad / 2) : 0;
    const descuento = pares * producto.precio;

    itemsConfirmados.push({
      producto_id:     producto.id,
      nombre_producto: producto.nombre,
      cantidad:        item.cantidad,
      precio_unitario: producto.en_oferta && producto.precio_oferta != null ? producto.precio_oferta : producto.precio,
      precio_lista:    producto.precio,
      descuento,
    });
  }

  const total         = itemsConfirmados.reduce((s, i) => s + i.precio_unitario * i.cantidad - i.descuento, 0);
  const subtotalLista = itemsConfirmados.reduce((s, i) => s + i.precio_lista    * i.cantidad, 0);

  // 'transferencia' y 'efectivo' son flujos manuales: el admin confirma el pago
  // cambiando el estado a 'Confirmado' via PATCH /api/pedidos/:id/estado
  //
  // El descuento de stock ya NO se hace acá con un loop aparte — pedidosRepo.crear
  // llama a la RPC crear_pedido_completo, que inserta el pedido y descuenta el
  // stock de cada item en la MISMA transacción de Postgres (ver supabase_migrations.sql,
  // sección 14). El chequeo de stock del loop de arriba sigue sirviendo como
  // camino feliz con mensaje claro; la RPC es la garantía real ante una carrera
  // con otro pedido consumiendo el mismo stock justo en el medio.
  const pedido = await pedidosRepo.crear(userId, dto, itemsConfirmados, total, subtotalLista);

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
  if (estado === 'Entregado') {
    await facturacionPedidosService.emitirFactura(pedido).catch(err => console.error('[facturacion]', err));
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
