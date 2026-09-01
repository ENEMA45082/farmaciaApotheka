import { supabase } from '../config/supabase';
import type { Perfil, ActualizarPerfilDTO, CrearClienteFisicoDTO } from '../types';

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
    es_cliente_fisico: Boolean(row.es_cliente_fisico),
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

// No hay unicidad de DNI a nivel DB, por eso devuelve una lista
// (normalmente 0 o 1 fila) en vez de asumir un único resultado.
// Excluye perfiles físicos ya fusionados (fusionado_en IS NULL): una vez
// fusionado, el CUIT solo debe encontrarse en la cuenta real que absorbió
// sus puntos — ver fusionarClienteFisico.
export async function encontrarPorDni(dni: string): Promise<Perfil[]> {
  const soloDigitos = dni.replace(/\D/g, '');

  // Si buscan con un número de 7-8 dígitos, además del match exacto hay que
  // matchear perfiles que guardaron un CUIT (11 dígitos) cuyo bloque central
  // (posiciones 3 a 10) sea ese mismo DNI — ver extraerDniDeCuit en
  // validarDocumento.ts. El patrón usa '_' (comodín de un solo carácter de
  // SQL LIKE; PostgREST no lo traduce, lo pasa tal cual a Postgres) para
  // matchear prefijo(2) + dni(8) + verificador(1).
  const query = supabase.from('perfiles').select('*').is('fusionado_en', null);
  const { data, error } = soloDigitos.length >= 7 && soloDigitos.length <= 8
    ? await query.or(`dni.eq.${soloDigitos},dni.like.__${soloDigitos.padStart(8, '0')}_`)
    : await query.eq('dni', soloDigitos);

  if (error) throw error;
  return (data ?? []).map(mapearPerfil);
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

// Alta manual de un cliente sin cuenta propia (compra física) — userId ya
// corresponde a un usuario real de Auth creado por
// puntos.service.ts::crearClienteFisico antes de llamar acá.
export async function crearClienteFisico(
  userId: string,
  dto: CrearClienteFisicoDTO & { creadoPorAdminId: string },
): Promise<Perfil> {
  const { data, error } = await supabase
    .from('perfiles')
    .insert({
      user_id:             userId,
      nombre:              dto.nombre,
      apellido:            dto.apellido,
      dni:                 dto.dni,
      documento_tipo:      'CUIT',
      telefono:            dto.telefono,
      email_contacto:      dto.email ?? null,
      es_cliente_fisico:   true,
      creado_por_admin_id: dto.creadoPorAdminId,
    })
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Error al crear el cliente físico');
  return mapearPerfil(data);
}

// Si existe un cliente físico sin reclamar con este mismo CUIT, le transfiere
// el saldo y todo su historial de puntos a userIdReal (ver
// supabase_migrations.sql, sección 25a) y lo marca como fusionado. Devuelve
// null si no había nada para fusionar.
export async function fusionarClienteFisico(
  userIdReal: string,
  dni: string,
): Promise<{ fusiono: boolean; puntos_sumados: number; saldo_total: number } | null> {
  const { data, error } = await supabase.rpc('fusionar_cliente_fisico', {
    p_user_id_real: userIdReal,
    p_dni:          dni,
  });

  if (error) throw error;
  return data as { fusiono: boolean; puntos_sumados: number; saldo_total: number } | null;
}
