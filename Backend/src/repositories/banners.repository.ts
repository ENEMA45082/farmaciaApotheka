import { supabase } from '../config/supabase';
import type { Banner } from '../types';

function mapearBanner(row: Record<string, unknown>): Banner {
  return {
    id:         row.id as string,
    imagen_url: row.imagen_url as string,
    link_url:   row.link_url as string | null,
    alt_texto:  row.alt_texto as string,
    orden:      row.orden as number,
    activo:     row.activo as boolean,
    creado_en:  row.creado_en as string,
  };
}

export async function encontrarTodos(opts: { soloActivos: boolean }): Promise<Banner[]> {
  let query = supabase.from('banners').select('*').order('orden', { ascending: true });
  if (opts.soloActivos) query = query.eq('activo', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapearBanner);
}

export async function encontrarPorId(id: string): Promise<Banner | null> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearBanner(data);
}

export async function crear(datos: {
  imagen_url: string;
  link_url: string | null;
  alt_texto: string;
  orden: number;
}): Promise<Banner> {
  const { data, error } = await supabase
    .from('banners')
    .insert(datos)
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Error al crear el banner');
  return mapearBanner(data);
}

export async function actualizar(id: string, cambios: Record<string, unknown>): Promise<Banner | null> {
  const { data, error } = await supabase
    .from('banners')
    .update(cambios)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) return null;
  return mapearBanner(data);
}

export async function eliminar(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', id);

  return !error;
}
