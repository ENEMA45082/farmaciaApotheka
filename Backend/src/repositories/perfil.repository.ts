import { supabase } from '../config/supabase';
import type { Perfil, ActualizarPerfilDTO } from '../types';

function mapearPerfil(row: Record<string, unknown>): Perfil {
  return {
    user_id:          row.user_id as string,
    nombre:           row.nombre as string | null,
    apellido:         row.apellido as string | null,
    dni:              row.dni as string | null,
    documento_tipo:   (row.documento_tipo as Perfil['documento_tipo']) ?? 'DNI',
    genero:           row.genero as string | null,
    fecha_nacimiento: row.fecha_nacimiento as string | null,
    telefono:         row.telefono as string | null,
    foto_url:         row.foto_url as string | null,
    creado_en:        row.creado_en as string,
    actualizado_en:   row.actualizado_en as string,
  };
}

export async function encontrarOCrear(
  userId: string,
  datosIniciales?: { nombre?: string; apellido?: string },
): Promise<Perfil> {
  const { data: existente } = await supabase
    .from('perfiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existente) return mapearPerfil(existente);

  const { data, error } = await supabase
    .from('perfiles')
    .insert({
      user_id:  userId,
      nombre:   datosIniciales?.nombre   ?? null,
      apellido: datosIniciales?.apellido ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    // Carrera: otra request ya creó la fila entre el SELECT y el INSERT
    const { data: existenteAhora, error: fetchError } = await supabase
      .from('perfiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (fetchError || !existenteAhora) throw fetchError ?? new Error('Error al obtener el perfil');
    return mapearPerfil(existenteAhora);
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
