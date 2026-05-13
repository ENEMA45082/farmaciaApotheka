import { supabase } from '../config/supabase';
import type { Categoria } from '../types';

function mapearCategoria(row: Record<string, unknown>): Categoria {
  return {
    id:        row.id as string,
    nombre:    row.name as string,
    slug:      row.slug as string,
    icono:     row.icon_name as string | null,
    creado_en: row.created_at as string,
  };
}

export async function encontrarTodas(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapearCategoria);
}

export async function encontrarPorId(id: string): Promise<Categoria | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearCategoria(data);
}

export async function crear(nombre: string, slug: string, icono: string | null): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: nombre, slug, icon_name: icono })
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Error al crear la categoría');
  return mapearCategoria(data);
}

export async function actualizar(id: string, cambios: Record<string, unknown>): Promise<Categoria | null> {
  const { data, error } = await supabase
    .from('categories')
    .update(cambios)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) return null;
  return mapearCategoria(data);
}

export async function eliminar(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  return !error;
}
