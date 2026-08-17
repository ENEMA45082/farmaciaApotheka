import { supabase } from '../config/supabase';
import { mapearProducto } from './productos.repository';
import type { ProductoDestacado } from '../types';

const SELECT_CON_PRODUCTO = '*, producto:products(*, categoria:categories(*))';

function mapearFila(row: Record<string, unknown>): ProductoDestacado {
  return {
    id:          row.id as string,
    producto_id: row.producto_id as string,
    orden:       row.orden as number,
    creado_en:   row.creado_en as string,
    producto:    row.producto ? mapearProducto(row.producto as Record<string, unknown>) : undefined,
  };
}

export async function encontrarTodos(): Promise<ProductoDestacado[]> {
  const { data, error } = await supabase
    .from('productos_destacados')
    .select(SELECT_CON_PRODUCTO)
    .order('orden', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapearFila);
}

export async function encontrarPorId(id: string): Promise<ProductoDestacado | null> {
  const { data, error } = await supabase
    .from('productos_destacados')
    .select(SELECT_CON_PRODUCTO)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearFila(data);
}

export async function encontrarPorProductoId(productoId: string): Promise<ProductoDestacado | null> {
  const { data, error } = await supabase
    .from('productos_destacados')
    .select('*')
    .eq('producto_id', productoId)
    .maybeSingle();

  if (error || !data) return null;
  return mapearFila(data);
}

export async function obtenerOrdenMaximo(): Promise<number> {
  const { data, error } = await supabase
    .from('productos_destacados')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? (data[0].orden as number) : -1;
}

export async function crear(productoId: string, orden: number): Promise<ProductoDestacado> {
  const { data, error } = await supabase
    .from('productos_destacados')
    .insert({ producto_id: productoId, orden })
    .select(SELECT_CON_PRODUCTO)
    .single();

  if (error || !data) throw error ?? new Error('Error al agregar el producto al carrusel');
  return mapearFila(data);
}

export async function actualizar(id: string, orden: number): Promise<ProductoDestacado | null> {
  const { data, error } = await supabase
    .from('productos_destacados')
    .update({ orden })
    .eq('id', id)
    .select(SELECT_CON_PRODUCTO)
    .single();

  if (error || !data) return null;
  return mapearFila(data);
}

export async function eliminar(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('productos_destacados')
    .delete()
    .eq('id', id);

  return !error;
}
