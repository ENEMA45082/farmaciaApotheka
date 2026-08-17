import { supabase } from '../config/supabase';
import type { Cupon, CuponConUsos, CrearCuponDTO, TipoCupon } from '../types';

function mapearCupon(row: Record<string, unknown>): Cupon {
  return {
    id:                      row.id as string,
    codigo:                  row.codigo as string,
    tipo:                    row.tipo as TipoCupon,
    valor:                   Number(row.valor),
    compra_minima:           Number(row.compra_minima ?? 0),
    descuento_maximo:        row.descuento_maximo != null ? Number(row.descuento_maximo) : null,
    limite_usos_total:       row.limite_usos_total != null ? Number(row.limite_usos_total) : null,
    limite_usos_por_cliente: row.limite_usos_por_cliente != null ? Number(row.limite_usos_por_cliente) : null,
    valido_desde:            row.valido_desde as string | null,
    valido_hasta:            row.valido_hasta as string | null,
    activo:                  row.activo as boolean,
    creado_en:               row.creado_en as string,
    actualizado_en:          row.actualizado_en as string,
  };
}

export async function encontrarPorCodigo(codigo: string): Promise<Cupon | null> {
  const { data, error } = await supabase
    .from('cupones')
    .select('*')
    .eq('codigo', codigo)
    .single();

  if (error || !data) return null;
  return mapearCupon(data);
}

export async function encontrarPorId(id: string): Promise<Cupon | null> {
  const { data, error } = await supabase
    .from('cupones')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearCupon(data);
}

export async function listarConUsos(): Promise<CuponConUsos[]> {
  const { data, error } = await supabase
    .from('cupones')
    .select('*, canjes_cupon(count)')
    .order('creado_en', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(row => ({
    ...mapearCupon(row),
    usos: Array.isArray(row.canjes_cupon) && row.canjes_cupon[0]
      ? Number((row.canjes_cupon[0] as { count: number }).count)
      : 0,
  }));
}

export async function crear(datos: CrearCuponDTO): Promise<Cupon> {
  const { data, error } = await supabase
    .from('cupones')
    .insert({ ...datos, codigo: datos.codigo.trim().toUpperCase() })
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Error al crear el cupón');
  return mapearCupon(data);
}

export async function actualizar(id: string, cambios: Record<string, unknown>): Promise<Cupon | null> {
  const { data, error } = await supabase
    .from('cupones')
    .update({ ...cambios, actualizado_en: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) return null;
  return mapearCupon(data);
}

export async function contarUsosTotal(cuponId: string): Promise<number> {
  const { count, error } = await supabase
    .from('canjes_cupon')
    .select('*', { count: 'exact', head: true })
    .eq('cupon_id', cuponId);

  if (error) throw error;
  return count ?? 0;
}

export async function contarUsosPorCliente(cuponId: string, clienteId: string): Promise<number> {
  const { count, error } = await supabase
    .from('canjes_cupon')
    .select('*', { count: 'exact', head: true })
    .eq('cupon_id', cuponId)
    .eq('cliente_id', clienteId);

  if (error) throw error;
  return count ?? 0;
}
