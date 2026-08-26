import { supabase } from '../config/supabase';
import { escaparPatronLike } from '../utils/escaparPatronLike';
import type { Categoria } from '../types';

function mapearCategoria(row: Record<string, unknown>): Categoria {
  return {
    id:       row.id as string,
    nombre:   row.nombre as string,
    id_padre: row.id_padre as string | null,
    creado_en: row.creado_en as string,
  };
}

export async function encontrarTodas(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapearCategoria);
}

export async function encontrarPaginadas(
  filtros: { busqueda?: string; pagina: number; limite: number }
): Promise<{ datos: Categoria[]; total: number }> {
  const desde = (filtros.pagina - 1) * filtros.limite;
  const hasta = desde + filtros.limite - 1;

  let query = supabase
    .from('categories')
    .select('*', { count: 'exact' })
    .order('nombre', { ascending: true });

  if (filtros.busqueda) {
    query = query.ilike('nombre', `%${escaparPatronLike(filtros.busqueda)}%`);
  }

  const { data, error, count } = await query.range(desde, hasta);
  if (error) throw error;

  return { datos: (data ?? []).map(mapearCategoria), total: count ?? 0 };
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

export async function crear(nombre: string, id_padre?: string): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ nombre, id_padre: id_padre ?? null })
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
