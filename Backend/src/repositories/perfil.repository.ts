import { supabase } from '../config/supabase';
import type { Perfil, ActualizarPerfilDTO } from '../types';

function mapearPerfil(row: Record<string, unknown>): Perfil {
  return {
    user_id:          row.user_id as string,
    nombre:           row.nombre as string | null,
    apellido:         row.apellido as string | null,
    dni:              row.dni as string | null,
    genero:           row.genero as string | null,
    fecha_nacimiento: row.fecha_nacimiento as string | null,
    telefono:         row.telefono as string | null,
    foto_url:         row.foto_url as string | null,
    creado_en:        row.creado_en as string,
    actualizado_en:   row.actualizado_en as string,
  };
}

export async function encontrarOCrear(userId: string): Promise<Perfil> {
  const { data, error } = await supabase
    .from('perfiles')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('*')
    .single();

  if (error || !data) {
    const { data: existing, error: fetchError } = await supabase
      .from('perfiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (fetchError || !existing) throw fetchError ?? new Error('Error al obtener el perfil');
    return mapearPerfil(existing);
  }
  return mapearPerfil(data);
}

export async function actualizar(userId: string, dto: ActualizarPerfilDTO): Promise<Perfil> {
  const { data, error } = await supabase
    .from('perfiles')
    .update({ ...dto, actualizado_en: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Error al actualizar el perfil');
  return mapearPerfil(data);
}
