import { supabase } from '../config/supabase';
import type { Direccion, GuardarDireccionDTO } from '../types';

function mapear(row: Record<string, unknown>): Direccion {
  return {
    id:               row.id as string,
    user_id:          row.user_id as string,
    calle:            row.calle as string,
    altura:           row.altura as string,
    piso:             row.piso as string | null,
    depto:            row.depto as string | null,
    ciudad:           row.ciudad as string,
    provincia:        row.provincia as string,
    provincia_codigo: row.provincia_codigo as Direccion['provincia_codigo'],
    pais:             row.pais as string,
    codigo_postal:    row.codigo_postal as string | null,
    lat:              row.lat != null ? Number(row.lat) : null,
    lng:              row.lng != null ? Number(row.lng) : null,
    creado_en:        row.creado_en as string,
  };
}

export async function obtener(userId: string): Promise<Direccion | null> {
  const { data, error } = await supabase
    .from('direcciones')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return mapear(data);
}

export async function guardar(userId: string, dto: GuardarDireccionDTO): Promise<Direccion> {
  const existente = await obtener(userId);

  const campos = {
    calle:            dto.calle,
    altura:           dto.altura,
    piso:             dto.piso ?? null,
    depto:            dto.depto ?? null,
    ciudad:           dto.ciudad,
    provincia:        dto.provincia,
    provincia_codigo: dto.provincia_codigo,
    pais:             dto.pais ?? 'Argentina',
    codigo_postal:    dto.codigo_postal ?? null,
    lat:              dto.lat ?? null,
    lng:              dto.lng ?? null,
  };

  let data: Record<string, unknown> | null = null;

  if (existente) {
    const result = await supabase
      .from('direcciones')
      .update(campos)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (result.error) throw result.error;
    data = result.data;
  } else {
    const result = await supabase
      .from('direcciones')
      .insert({ user_id: userId, ...campos })
      .select('*')
      .single();
    if (result.error) throw result.error;
    data = result.data;
  }

  if (!data) throw new Error('Error al guardar la dirección');
  return mapear(data);
}
