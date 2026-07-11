import { supabase } from '../config/supabase';
import type { Factura } from '../types';

function mapearFactura(row: Record<string, unknown>): Factura {
  return {
    id:               row.id as string,
    pedido_id:        row.pedido_id as string,
    estado:           row.estado as Factura['estado'],
    tipo_comprobante: row.tipo_comprobante != null ? Number(row.tipo_comprobante) : null,
    punto_venta:      row.punto_venta      != null ? Number(row.punto_venta)      : null,
    nro_comprobante:  row.nro_comprobante  != null ? Number(row.nro_comprobante)  : null,
    cae:              row.cae as string | null,
    cae_vencimiento:  row.cae_vencimiento as string | null,
    importe_total:    row.importe_total != null ? Number(row.importe_total) : null,
    respuesta_error:  row.respuesta_error as string | null,
    intentos:         Number(row.intentos ?? 0),
    pdf_url:          row.pdf_url as string | null,
    creado_en:        row.creado_en as string,
    actualizado_en:   row.actualizado_en as string,
  };
}

export async function crear(pedidoId: string): Promise<Factura> {
  const { data, error } = await supabase
    .from('facturas')
    .insert({ pedido_id: pedidoId })
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Error al crear el registro de factura');
  return mapearFactura(data);
}

export async function actualizar(id: string, cambios: {
  estado?: Factura['estado'];
  tipo_comprobante?: number;
  punto_venta?: number;
  nro_comprobante?: number;
  cae?: string;
  cae_vencimiento?: string;
  importe_total?: number;
  respuesta_error?: string;
  pdf_url?: string;
  incrementarIntentos?: boolean;
}): Promise<Factura | null> {
  const actualizacion: Record<string, unknown> = { actualizado_en: new Date().toISOString() };
  if (cambios.estado           !== undefined) actualizacion.estado           = cambios.estado;
  if (cambios.tipo_comprobante !== undefined) actualizacion.tipo_comprobante = cambios.tipo_comprobante;
  if (cambios.punto_venta      !== undefined) actualizacion.punto_venta      = cambios.punto_venta;
  if (cambios.nro_comprobante  !== undefined) actualizacion.nro_comprobante  = cambios.nro_comprobante;
  if (cambios.cae              !== undefined) actualizacion.cae              = cambios.cae;
  if (cambios.cae_vencimiento  !== undefined) actualizacion.cae_vencimiento  = cambios.cae_vencimiento;
  if (cambios.importe_total    !== undefined) actualizacion.importe_total    = cambios.importe_total;
  if (cambios.respuesta_error  !== undefined) actualizacion.respuesta_error  = cambios.respuesta_error;
  if (cambios.pdf_url          !== undefined) actualizacion.pdf_url          = cambios.pdf_url;

  if (cambios.incrementarIntentos) {
    const actual = await encontrarPorId(id);
    actualizacion.intentos = (actual?.intentos ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from('facturas')
    .update(actualizacion)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) return null;
  return mapearFactura(data);
}

export async function encontrarPorId(id: string): Promise<Factura | null> {
  const { data, error } = await supabase
    .from('facturas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearFactura(data);
}

export async function encontrarConError(): Promise<Factura[]> {
  const { data, error } = await supabase
    .from('facturas')
    .select('*')
    .eq('estado', 'error')
    .order('actualizado_en', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapearFactura);
}

export async function encontrarEmitidasSinPdf(): Promise<Factura[]> {
  const { data, error } = await supabase
    .from('facturas')
    .select('*')
    .eq('estado', 'emitida')
    .is('pdf_url', null)
    .order('actualizado_en', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapearFactura);
}

export async function encontrarPorPedidoId(pedidoId: string): Promise<Factura | null> {
  const { data, error } = await supabase
    .from('facturas')
    .select('*')
    .eq('pedido_id', pedidoId)
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapearFactura(data);
}
