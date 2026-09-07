import { supabase } from '../config/supabase';
import { mapearProducto } from './productos.repository';
import type { ComboItem } from '../types';

// combo_items tiene DOS FKs a products (combo_id y producto_id) — a
// diferencia de productos_destacados (una sola), acá el embed de "producto"
// necesita el nombre de constraint explícito o PostgREST no sabe cuál de
// las dos relaciones usar ("more than one relationship was found").
const SELECT_CON_PRODUCTO = '*, producto:products!combo_items_producto_id_fkey(*, categoria:categories(*))';

function mapearFila(row: Record<string, unknown>): ComboItem {
  return {
    id:          row.id as string,
    combo_id:    row.combo_id as string,
    producto_id: row.producto_id as string,
    cantidad:    Number(row.cantidad),
    creado_en:   row.creado_en as string,
    producto:    row.producto ? mapearProducto(row.producto as Record<string, unknown>) : undefined,
  };
}

export async function encontrarPorComboId(comboId: string): Promise<ComboItem[]> {
  const { data, error } = await supabase
    .from('combo_items')
    .select(SELECT_CON_PRODUCTO)
    .eq('combo_id', comboId)
    .order('creado_en', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapearFila);
}

export async function encontrarPorId(id: string): Promise<ComboItem | null> {
  const { data, error } = await supabase
    .from('combo_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearFila(data);
}

export async function encontrarPorComboIdYProductoId(comboId: string, productoId: string): Promise<ComboItem | null> {
  const { data, error } = await supabase
    .from('combo_items')
    .select('*')
    .eq('combo_id', comboId)
    .eq('producto_id', productoId)
    .maybeSingle();

  if (error || !data) return null;
  return mapearFila(data);
}

// Para el chequeo de borrado en productos.service.ts::eliminar (mismo
// patrón que categorias.service.ts::eliminar con contarPorCategorias).
export async function encontrarCombosQueUsanProducto(
  productoId: string
): Promise<{ combo_id: string; combo_nombre: string }[]> {
  const { data, error } = await supabase
    .from('combo_items')
    .select('combo_id, combo:products!combo_items_combo_id_fkey(nombre)')
    .eq('producto_id', productoId);

  if (error) throw error;
  return (data ?? []).map(fila => ({
    combo_id:     fila.combo_id as string,
    combo_nombre: (fila.combo as unknown as { nombre: string } | null)?.nombre ?? 'combo desconocido',
  }));
}

export async function crear(comboId: string, productoId: string, cantidad: number): Promise<ComboItem> {
  const { data, error } = await supabase
    .from('combo_items')
    .insert({ combo_id: comboId, producto_id: productoId, cantidad })
    .select(SELECT_CON_PRODUCTO)
    .single();

  if (error || !data) throw error ?? new Error('Error al agregar el componente al combo');
  return mapearFila(data);
}

export async function actualizarCantidad(id: string, cantidad: number): Promise<ComboItem | null> {
  const { data, error } = await supabase
    .from('combo_items')
    .update({ cantidad })
    .eq('id', id)
    .select(SELECT_CON_PRODUCTO)
    .single();

  if (error || !data) return null;
  return mapearFila(data);
}

export async function eliminar(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('combo_items')
    .delete()
    .eq('id', id);

  return !error;
}
