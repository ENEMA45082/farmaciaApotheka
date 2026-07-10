import * as pedidosRepo from '../repositories/pedidos.repository';
import * as productosRepo from '../repositories/productos.repository';
import * as direccionesRepo from '../repositories/direcciones.repository';
import * as perfilRepo from '../repositories/perfil.repository';
import * as pedidoHistorialRepo from '../repositories/pedidoHistorial.repository';
import * as facturasRepo from '../repositories/facturas.repository';
import * as correoArgentino from './correoArgentino.service';
import * as facturacionService from './facturacion.service';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import { supabase } from '../config/supabase';
import { PESO_DEFAULT_GRAMOS } from '../config/envioConfig';
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
    throw new AppError('El pedido debe tener al menos un producto', 400);
  }

  if (dto.metodo_envio === 'domicilio') {
    if (!dto.destinatario_nombre?.trim()) throw new AppError('El nombre del destinatario es obligatorio', 400);
    if (!dto.destinatario_dni?.trim())    throw new AppError('El DNI del destinatario es obligatorio', 400);
  }

  for (const item of dto.items) {
    const producto = await productosRepo.encontrarPorId(item.producto_id);
    if (!producto) {
      throw new AppError(`Producto no encontrado: ${item.nombre_producto}`, 404);
    }
    if (producto.stock < item.cantidad) {
      throw new AppError(
        `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}`,
        400,
      );
    }
  }

  const total         = dto.items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
  const subtotalLista = dto.items.reduce((s, i) => s + i.precio_lista    * i.cantidad, 0);

  // 'transferencia' y 'efectivo' son flujos manuales: el admin confirma el pago
  // cambiando el estado a 'Confirmado' via PATCH /api/pedidos/:id/estado
  const pedido = await pedidosRepo.crear(userId, dto, total, subtotalLista);

  for (const item of dto.items) {
    await productosRepo.descontarStock(item.producto_id, item.cantidad);
  }

  return pedido;
}

export async function listar(userId: string): Promise<Pedido[]> {
  return pedidosRepo.encontrarPorUsuario(userId);
}

export async function obtenerPorId(id: string, userId: string): Promise<Pedido> {
  validarUUID(id, 'pedido');
  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404);
  if (pedido.user_id !== userId) throw new AppError('Acceso denegado', 403);
  return pedido;
}

export async function obtenerPorIdAdmin(id: string): Promise<PedidoDetalleAdmin> {
  validarUUID(id, 'pedido');
  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404);

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
    },
    direccion_envio: direccion,
    factura,
  };
}

export async function reintentarFactura(id: string): Promise<Pedido> {
  validarUUID(id, 'pedido');
  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404);
  await facturacionService.emitirFactura(pedido);
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
    );
  }

  if (estado === 'Cancelado') {
    throw new AppError('Para cancelar un pedido usá la acción de cancelación e indicá un motivo', 400);
  }

  const pedidoActual = await pedidosRepo.encontrarPorId(id);
  if (!pedidoActual) throw new AppError('Pedido no encontrado', 404);

  if (!puedeTransicionar(pedidoActual.estado, estado)) {
    const validos = TRANSICIONES_VALIDAS_PARA(pedidoActual.estado);
    throw new AppError(
      `No se puede pasar de '${pedidoActual.estado}' a '${estado}'. Transiciones válidas: ${validos.length ? validos.join(', ') : 'ninguna (estado final)'}`,
      400,
    );
  }

  if (estado === 'Enviado' && pedidoActual.metodo_envio === 'retiro_farmacia') {
    throw new AppError('Los pedidos con retiro en farmacia deben pasar a "Listo para retirar", no a "Enviado"', 400);
  }
  if (estado === 'ListoParaRetirar' && pedidoActual.metodo_envio !== 'retiro_farmacia') {
    throw new AppError('Solo los pedidos con retiro en farmacia pueden marcarse como "Listo para retirar"', 400);
  }

  if (estado === 'Enviado' && !pedidoActual.shipping_tracking_number) {
    const resultado = await crearEnvioReal(pedidoActual);
    if (!resultado.ok) {
      // No bloquea la transición de estado: el admin puede querer marcar
      // "enviado" igual aunque Correo Argentino rechace el alta. El error
      // queda registrado para revisión.
      await pedidosRepo.actualizarEstado(id, estado, { shipping_error: resultado.errorMessage });
    } else {
      await pedidosRepo.actualizarEstado(id, estado, {
        shipping_tracking_number: pedidoActual.id,
        shipping_fecha_envio: new Date().toISOString(),
        shipping_creado_en_correo: resultado.createdAt,
      });
    }
  } else {
    await pedidosRepo.actualizarEstado(id, estado);
  }

  await pedidoHistorialRepo.registrar({
    pedido_id: id,
    estado_anterior: pedidoActual.estado,
    estado_nuevo: estado,
    motivo: null,
    changed_by: adminUserId,
  });

  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404);

  if (estado === 'Confirmado') {
    await facturacionService.emitirFactura(pedido).catch(err => console.error('[facturacion]', err));
  }

  return pedido;
}

function TRANSICIONES_VALIDAS_PARA(estado: EstadoPedido): EstadoPedido[] {
  return ESTADOS_PEDIDO.filter(e => puedeTransicionar(estado, e));
}

export async function cancelarPedido(id: string, motivo: string, adminUserId: string): Promise<Pedido> {
  validarUUID(id, 'pedido');
  if (!esMotivoCancelacionValido(motivo)) {
    throw new AppError(`Motivo inválido: '${motivo}'`, 400);
  }

  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404);

  if (ESTADOS_FINALES.includes(pedido.estado)) {
    throw new AppError(`El pedido ya está en estado '${pedido.estado}' y no se puede cancelar`, 400);
  }

  await pedidosRepo.actualizarEstado(id, 'Cancelado', { motivo_cancelacion: motivo });

  for (const detalle of pedido.detalles ?? []) {
    if (detalle.producto_id) {
      await productosRepo.restaurarStock(detalle.producto_id, detalle.cantidad);
    }
  }

  await pedidoHistorialRepo.registrar({
    pedido_id: id,
    estado_anterior: pedido.estado,
    estado_nuevo: 'Cancelado',
    motivo,
    changed_by: adminUserId,
  });

  const actualizado = await pedidosRepo.encontrarPorId(id);
  if (!actualizado) throw new AppError('Pedido no encontrado', 404);
  return actualizado;
}

async function crearEnvioReal(pedido: Pedido) {
  const direccion = pedido.metodo_envio === 'domicilio'
    ? await direccionesRepo.obtener(pedido.user_id)
    : null;

  const { data: userData } = await supabase.auth.admin.getUserById(pedido.user_id);
  const email = userData?.user?.email ?? '';

  const pesoTotalGramos = (pedido.detalles ?? []).reduce(
    (s, d) => s + PESO_DEFAULT_GRAMOS * d.cantidad,
    0,
  ) || PESO_DEFAULT_GRAMOS;

  return correoArgentino.crearEnvio({
    extOrderId: pedido.id,
    orderNumber: String(pedido.nro_pedido),
    recipient: {
      name: pedido.destinatario_nombre ?? '',
      cellPhone: `${pedido.destinatario_cod_area ?? ''}${pedido.destinatario_telefono ?? ''}`,
      email,
    },
    deliveryType: pedido.metodo_envio === 'retiro_sucursal' ? 'S' : 'D',
    agency: pedido.metodo_envio === 'retiro_sucursal' ? (pedido.sucursal_correo_argentino ?? undefined) : undefined,
    address: pedido.metodo_envio === 'domicilio' && direccion ? {
      streetName: direccion.calle,
      streetNumber: direccion.altura,
      floor: direccion.piso ?? undefined,
      apartment: direccion.depto ?? undefined,
      city: direccion.ciudad,
      provinceCode: direccion.provincia_codigo!,
      postalCode: direccion.codigo_postal ?? '',
    } : undefined,
    weightGramos: pesoTotalGramos,
    declaredValue: Math.round(pedido.total),
  });
}

export async function obtenerTracking(id: string, userId: string): Promise<ResultadoTracking> {
  const pedido = await obtenerPorId(id, userId);
  if (!pedido.shipping_tracking_number) {
    throw new AppError('Este pedido todavía no tiene un envío generado', 400);
  }
  return correoArgentino.obtenerTracking(pedido.shipping_tracking_number);
}

export async function cancelar(id: string, userId: string): Promise<Pedido> {
  validarUUID(id, 'pedido');
  const pedido = await obtenerPorId(id, userId);
  if (pedido.estado !== 'PendienteDePago') {
    throw new AppError('Solo se pueden cancelar pedidos en estado pendiente de pago', 400);
  }
  const cancelado = await pedidosRepo.cancelar(id, userId, 'solicitado_por_cliente');
  if (!cancelado) throw new AppError('Error al cancelar el pedido', 500);

  for (const detalle of cancelado.detalles ?? []) {
    if (detalle.producto_id) {
      await productosRepo.restaurarStock(detalle.producto_id, detalle.cantidad);
    }
  }

  return cancelado;
}
