import { supabase } from '../config/supabase';

export async function listarIdsPorUsuario(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('favoritos')
    .select('producto_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map((f: { producto_id: string }) => f.producto_id);
}

export async function agregar(userId: string, productoId: string): Promise<void> {
  const { error } = await supabase
    .from('favoritos')
    .insert({ user_id: userId, producto_id: productoId });

  if (error) throw error;
}

export async function quitar(userId: string, productoId: string): Promise<void> {
  const { error } = await supabase
    .from('favoritos')
    .delete()
    .eq('user_id', userId)
    .eq('producto_id', productoId);

  if (error) throw error;
}

export async function existe(userId: string, productoId: string): Promise<boolean> {
  const { data } = await supabase
    .from('favoritos')
    .select('id')
    .eq('user_id', userId)
    .eq('producto_id', productoId)
    .maybeSingle();

  return data !== null;
}
