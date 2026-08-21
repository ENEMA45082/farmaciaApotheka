import { supabase } from '../config/supabase';
import type { BannerPromo } from '../types';

function mapearBannerPromo(row: Record<string, unknown>): BannerPromo {
  return {
    id:             row.id as string,
    imagen_url:     row.imagen_url as string,
    titulo:         row.titulo as string,
    vigencia_texto: row.vigencia_texto as string | null,
    badge_texto:    row.badge_texto as string | null,
    tema:           row.tema as BannerPromo['tema'],
    link_url:       row.link_url as string | null,
    orden:          row.orden as number,
    activo:         row.activo as boolean,
    creado_en:      row.creado_en as string,
  };
}

export async function encontrarTodos(opts: { soloActivos: boolean }): Promise<BannerPromo[]> {
  let query = supabase.from('banners_promo').select('*').order('orden', { ascending: true });
  if (opts.soloActivos) query = query.eq('activo', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapearBannerPromo);
}

export async function encontrarPorId(id: string): Promise<BannerPromo | null> {
  const { data, error } = await supabase
    .from('banners_promo')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearBannerPromo(data);
}

export async function crear(datos: {
  imagen_url: string;
  titulo: string;
  vigencia_texto: string | null;
  badge_texto: string | null;
  tema: string;
  link_url: string | null;
  orden: number;
}): Promise<BannerPromo> {
  const { data, error } = await supabase
    .from('banners_promo')
    .insert(datos)
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Error al crear el banner promocional');
  return mapearBannerPromo(data);
}

export async function actualizar(id: string, cambios: Record<string, unknown>): Promise<BannerPromo | null> {
  const { data, error } = await supabase
    .from('banners_promo')
    .update(cambios)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) return null;
  return mapearBannerPromo(data);
}

export async function eliminar(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('banners_promo')
    .delete()
    .eq('id', id);

  return !error;
}
