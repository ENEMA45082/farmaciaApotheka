import { supabase } from '../config/supabase';
import type { Pedido, DetallePedido, CrearPedidoDTO } from '../types';

function mapearDetalle(row: Record<string, unknown>): DetallePedido {
  return {
    id:              row.id as string,
    pedido_id:       row.pedido_id as string,
    producto_id:     row.producto_id as string | null,
    nombre_producto: row.nombre_producto as string,
    cantidad:        Number(row.cantidad),
    precio_unitario: Number(row.precio_unitario),
    precio_lista:    Number(row.precio_lista),
    subtotal:        Number(row.subtotal),
  };
}

function mapearPedido(row: Record<string, unknown>): Pedido {
  return {
    id:               row.id as string,
    user_id:          row.user_id as string,
    estado:           row.estado as Pedido['estado'],
    total:            Number(row.total),
    subtotal_lista:   Number(row.subtotal_lista),
    nro_pedido:       Number(row.nro_pedido),
    notas:            row.notas as string | null,
    metodo_envio:     (row.metodo_envio as Pedido['metodo_envio']) ?? 'retiro_farmacia',
    costo_envio:      Number(row.costo_envio ?? 0),
    sucursal_andreani: row.sucursal_andreani as string | null ?? null,
    codigo_postal_envio: row.codigo_postal_envio as string | null ?? null,
    metodo_pago:   row.metodo_pago as import('../types').MetodoPago | null ?? null,
    pw_payment_id: row.pw_payment_id as string | null ?? null,
    fecha_pedido:     row.fecha_pedido as string,
    fecha_cancelacion: row.fecha_cancelacion as string | null,
    creado_en:        row.creado_en as string,
    detalles: Array.isArray(row.detalles_pedido)
      ? (row.detalles_pedido as Record<string, unknown>[]).map(mapearDetalle)
      : undefined,
  };
}

export async function crear(
  userId: string,
  dto: CrearPedidoDTO,
  total: number,
  subtotalLista: number,
): Promise<Pedido> {
  const { data: pedido, error: errPedido } = await supabase
    .from('pedidos')
    .insert({
      user_id:             userId,
      total:               total + (dto.costo_envio ?? 0),
      subtotal_lista:      subtotalLista,
      notas:               dto.notas ?? null,
      metodo_envio:        dto.metodo_envio ?? 'retiro_farmacia',
      costo_envio:         dto.costo_envio ?? 0,
      sucursal_andreani:   dto.sucursal_andreani ?? null,
      codigo_postal_envio: dto.codigo_postal_envio ?? null,
      metodo_pago:         dto.metodo_pago ?? null,
    })
    .select('*')
    .single();

  if (errPedido || !pedido) throw errPedido ?? new Error('Error al crear pedido');

  const detalles = dto.items.map(i => ({
    pedido_id:       pedido.id,
    producto_id:     i.producto_id,
    nombre_producto: i.nombre_producto,
    cantidad:        i.cantidad,
    precio_unitario: i.precio_unitario,
    precio_lista:    i.precio_lista,
    subtotal:        i.precio_unitario * i.cantidad,
  }));

  const { data: detData, error: errDet } = await supabase
    .from('detalles_pedido')
    .insert(detalles)
    .select('*');

  if (errDet) throw errDet;

  return mapearPedido({ ...pedido, detalles_pedido: detData ?? [] });
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
    .select('*, detalles_pedido(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearPedido(data);
}

export async function actualizarEstado(
  id: string,
  estado: Pedido['estado'],
  extras?: { pw_payment_id?: string },
): Promise<void> {
  const cambios: Record<string, unknown> = { estado };
  if (extras?.pw_payment_id) cambios.pw_payment_id = extras.pw_payment_id;
  await supabase.from('pedidos').update(cambios).eq('id', id);
}

export async function encontrarTodos(): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, detalles_pedido(*)')
    .order('fecha_pedido', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapearPedido);
}

export async function cancelar(id: string, userId: string): Promise<Pedido | null> {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: 'cancelado', fecha_cancelacion: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('estado', 'pendiente')
    .select('id');

  if (error || !data || data.length === 0) return null;
  return encontrarPorId(id);
}
