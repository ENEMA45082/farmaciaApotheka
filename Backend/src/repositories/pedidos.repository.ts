import { supabase } from '../config/supabase';
import * as estadosRepo from './estados.repository';
import { AppError } from '../errors/AppError';
import type { Pedido, DetallePedido, CrearPedidoDTO, ItemPedidoConfirmado } from '../types';

function mapearDetalle(row: Record<string, unknown>): DetallePedido {
  return {
    id:              row.id as string,
    pedido_id:       row.pedido_id as string,
    producto_id:     row.producto_id as string | null,
    nombre_producto: row.nombre_producto as string,
    cantidad:        Number(row.cantidad),
    precio_unitario: Number(row.precio_unitario),
    precio_lista:    Number(row.precio_lista),
    descuento:       Number(row.descuento ?? 0),
    subtotal:        Number(row.subtotal),
  };
}

function mapearPedido(row: Record<string, unknown>): Pedido {
  return {
    id:               row.id as string,
    user_id:          row.user_id as string,
    estado:           estadosRepo.getNombreById(row.estado_id as number),
    total:            Number(row.total),
    subtotal_lista:   Number(row.subtotal_lista),
    nro_pedido:       Number(row.nro_pedido),
    notas:            row.notas as string | null,
    metodo_envio:     (row.metodo_envio as Pedido['metodo_envio']) ?? 'retiro_farmacia',
    costo_envio:      Number(row.costo_envio ?? 0),
    tipo_servicio_envio: row.tipo_servicio_envio as Pedido['tipo_servicio_envio'] ?? null,
    sucursal_correo_argentino: row.sucursal_correo_argentino as string | null ?? null,
    codigo_postal_envio: row.codigo_postal_envio as string | null ?? null,
    metodo_pago:   row.metodo_pago as import('../types').MetodoPago | null ?? null,
    pw_payment_id:      row.pw_payment_id as string | null ?? null,
    pw_site_transaction_id: row.pw_site_transaction_id as string | null ?? null,
    fecha_pedido:       row.fecha_pedido as string,
    fecha_cancelacion:  row.fecha_cancelacion as string | null,
    motivo_cancelacion: row.motivo_cancelacion as string | null ?? null,
    creado_en:          row.creado_en as string,
    shipping_tracking_number:  row.shipping_tracking_number as string | null ?? null,
    shipping_fecha_envio:      row.shipping_fecha_envio as string | null ?? null,
    shipping_creado_en_correo: row.shipping_creado_en_correo as string | null ?? null,
    shipping_error:            row.shipping_error as string | null ?? null,
    destinatario_nombre:       row.destinatario_nombre as string | null ?? null,
    destinatario_dni:          row.destinatario_dni as string | null ?? null,
    destinatario_cod_area:     row.destinatario_cod_area as string | null ?? null,
    destinatario_telefono:     row.destinatario_telefono as string | null ?? null,
    cupon_id:           row.cupon_id as string | null ?? null,
    // Join contra cupones solo trae algo cuando encontrarPorId pide
    // "cupones(codigo)" en el select — encontrarPorUsuario/encontrarTodos no
    // lo piden (esas vistas no muestran el código), así que ahí siempre da null.
    cupon_codigo:       (row.cupones as { codigo: string } | null)?.codigo ?? null,
    descuento_cupon:    Number(row.descuento_cupon ?? 0),
    puntos_ganados:     Number(row.puntos_ganados ?? 0),
    detalles: Array.isArray(row.detalles_pedido)
      ? (row.detalles_pedido as Record<string, unknown>[]).map(mapearDetalle)
      : undefined,
  };
}

export async function crear(
  userId: string,
  dto: CrearPedidoDTO,
  itemsConfirmados: ItemPedidoConfirmado[],
  total: number,
  subtotalLista: number,
  cuponId?: string,
  descuentoCupon = 0,
): Promise<Pedido> {
  const items = itemsConfirmados.map(i => ({
    producto_id:     i.producto_id,
    nombre_producto: i.nombre_producto,
    cantidad:        i.cantidad,
    precio_unitario: i.precio_unitario,
    precio_lista:    i.precio_lista,
    descuento:       i.descuento,
    subtotal:        i.precio_unitario * i.cantidad - i.descuento,
  }));

  // RPC atómica: si falla la inserción de detalles, el pedido se revierte
  const { data: pedidoData, error } = await supabase.rpc('crear_pedido_completo', {
    p_user_id:                  userId,
    p_total:                    total + (dto.costo_envio ?? 0),
    p_subtotal_lista:           subtotalLista,
    p_notas:                    dto.notas ?? null,
    p_metodo_envio:             dto.metodo_envio ?? 'retiro_farmacia',
    p_costo_envio:              dto.costo_envio ?? 0,
    p_tipo_servicio_envio:      dto.tipo_servicio_envio ?? null,
    p_sucursal_correo_argentino: dto.sucursal_correo_argentino ?? null,
    p_codigo_postal_envio:      dto.codigo_postal_envio ?? null,
    p_metodo_pago:              dto.metodo_pago ?? null,
    p_items:                    items,
    p_destinatario_nombre:      dto.destinatario_nombre ?? null,
    p_destinatario_dni:         dto.destinatario_dni ?? null,
    p_destinatario_cod_area:    dto.destinatario_cod_area ?? null,
    p_destinatario_telefono:    dto.destinatario_telefono ?? null,
    p_cupon_id:                 cuponId ?? null,
    p_descuento_cupon:          descuentoCupon,
  });

  if (error || !pedidoData) {
    // crear_pedido_completo descuenta stock y registra el canje del cupón
    // (si hay) atómicamente adentro de la misma transacción (ver
    // supabase_migrations.sql, secciones 14 y 18) — si algo se agotó justo
    // en el medio (carrera con otro pedido), Postgres aborta todo y devuelve
    // uno de estos mensajes. Se traducen a un AppError legible en vez de
    // dejarlos caer como error interno genérico.
    if (error?.message?.includes('stock_insuficiente')) {
      throw new AppError(
        'El stock de algún producto cambió mientras se procesaba el pedido. Volvé a intentarlo.',
        409,
        'STOCK_INSUFICIENTE',
      );
    }
    if (error?.message?.includes('cupon_limite_usos_alcanzado') || error?.message?.includes('cupon_limite_cliente_alcanzado')) {
      throw new AppError(
        'El cupón alcanzó su límite de usos mientras se procesaba el pedido.',
        409,
        'CUPON_LIMITE_USOS_ALCANZADO',
      );
    }
    if (error?.message?.includes('cupon_invalido')) {
      throw new AppError('El cupón ya no es válido.', 409, 'CUPON_INVALIDO');
    }
    throw error ?? new Error('Error al crear pedido');
  }

  // Obtener el pedido completo con detalles
  const pedido = await encontrarPorId((pedidoData as Record<string, unknown>).id as string);
  if (!pedido) throw new Error('Pedido creado pero no encontrado');
  return pedido;
}

export async function encontrarPorUsuario(userId: string): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, detalles_pedido(*)')
    .eq('user_id', userId)
    .order('fecha_pedido', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapearPedido);
}

export async function encontrarPorId(id: string): Promise<Pedido | null> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, detalles_pedido(*), cupones(codigo)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearPedido(data);
}

export async function actualizarEstado(
  id: string,
  estado: Pedido['estado'],
  extras?: {
    pw_payment_id?: string;
    pw_site_transaction_id?: string;
    motivo_cancelacion?: string;
    shipping_tracking_number?: string;
    shipping_fecha_envio?: string;
    shipping_creado_en_correo?: string;
    shipping_error?: string;
  },
): Promise<void> {
  const cambios: Record<string, unknown> = { estado_id: estadosRepo.getIdByNombre(estado) };
  if (extras?.pw_payment_id)              cambios.pw_payment_id              = extras.pw_payment_id;
  if (extras?.pw_site_transaction_id)     cambios.pw_site_transaction_id     = extras.pw_site_transaction_id;
  if (extras?.motivo_cancelacion)         cambios.motivo_cancelacion         = extras.motivo_cancelacion;
  if (extras?.shipping_tracking_number)   cambios.shipping_tracking_number   = extras.shipping_tracking_number;
  if (extras?.shipping_fecha_envio)       cambios.shipping_fecha_envio       = extras.shipping_fecha_envio;
  if (extras?.shipping_creado_en_correo)  cambios.shipping_creado_en_correo  = extras.shipping_creado_en_correo;
  if (extras?.shipping_error)             cambios.shipping_error             = extras.shipping_error;
  if (estado === 'Cancelado') {
    cambios.fecha_cancelacion = new Date().toISOString();
  }
  await supabase.from('pedidos').update(cambios).eq('id', id);
}

export async function encontrarTodos(
  pagina = 1,
  limite = 20,
): Promise<{ datos: Pedido[]; total: number }> {
  const desde = (pagina - 1) * limite;

  const { data, error, count } = await supabase
    .from('pedidos')
    .select('*, detalles_pedido(*)', { count: 'exact' })
    .order('fecha_pedido', { ascending: false })
    .range(desde, desde + limite - 1);

  if (error) throw error;
  return { datos: (data ?? []).map(mapearPedido), total: count ?? 0 };
}

export async function encontrarPorPwPaymentId(pwPaymentId: string): Promise<Pedido | null> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, detalles_pedido(*)')
    .eq('pw_payment_id', pwPaymentId)
    .single();

  if (error || !data) return null;
  return mapearPedido(data);
}

export async function guardarPwPaymentId(id: string, pwPaymentId: string): Promise<void> {
  await supabase.from('pedidos').update({ pw_payment_id: pwPaymentId }).eq('id', id);
}

// Cancelación iniciada por el propio cliente: exige que el pedido sea suyo y
// que esté en PendienteDePago. Restaura el stock de sus detalles en la misma
// transacción (ver cancelar_pedido_completo en supabase_migrations.sql,
// sección 14) — antes esto era un update + un loop de restaurarStock() aparte
// desde Node, no atómico entre sí.
export async function cancelar(
  id: string,
  userId: string,
  motivo?: string,
): Promise<Pedido | null> {
  const { data, error } = await supabase.rpc('cancelar_pedido_completo', {
    p_pedido_id: id,
    p_motivo: motivo ?? null,
    p_user_id: userId,
    p_estado_id_requerido: estadosRepo.getIdByNombre('PendienteDePago'),
  });

  if (error || !data) return null;
  return encontrarPorId((data as Record<string, unknown>).id as string);
}

// Cancelación sin restricción de dueño/estado — para flujos donde esa regla
// ya la validó quien llama: el admin (cualquier estado no final) o el webhook
// de Payway cuando un pago queda rechazado/cancelado.
export async function cancelarSinRestricciones(id: string, motivo: string): Promise<Pedido | null> {
  const { data, error } = await supabase.rpc('cancelar_pedido_completo', {
    p_pedido_id: id,
    p_motivo: motivo,
  });

  if (error || !data) return null;
  return encontrarPorId((data as Record<string, unknown>).id as string);
}
