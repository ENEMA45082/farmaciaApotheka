import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import type {
  Premio,
  CrearPremioDTO,
  MovimientoPuntos,
  TipoMovimientoPuntos,
  CanjePremio,
  CanjePremioConDetalle,
} from '../types';

function mapearPremio(row: Record<string, unknown>): Premio {
  return {
    id:              row.id as string,
    nombre:          row.nombre as string,
    descripcion:     row.descripcion as string | null,
    imagen_url:      row.imagen_url as string | null,
    costo_puntos:    Number(row.costo_puntos),
    stock:           row.stock != null ? Number(row.stock) : null,
    activo:          row.activo as boolean,
    creado_en:       row.creado_en as string,
    actualizado_en:  row.actualizado_en as string,
  };
}

function mapearMovimiento(row: Record<string, unknown>): MovimientoPuntos {
  return {
    id:         row.id as string,
    cliente_id: row.cliente_id as string,
    tipo:       row.tipo as TipoMovimientoPuntos,
    puntos:     Number(row.puntos),
    pedido_id:  row.pedido_id as string | null,
    canje_id:   row.canje_id as string | null,
    motivo:     row.motivo as string | null,
    creado_en:  row.creado_en as string,
  };
}

function mapearCanje(row: Record<string, unknown>): CanjePremio {
  return {
    id:              row.id as string,
    cliente_id:      row.cliente_id as string,
    premio_id:       row.premio_id as string,
    puntos_gastados: Number(row.puntos_gastados),
    canjeado_en:     row.canjeado_en as string,
  };
}

export async function obtenerSaldo(clienteId: string): Promise<number> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('puntos_saldo')
    .eq('user_id', clienteId)
    .single();

  if (error || !data) return 0;
  return Number(data.puntos_saldo ?? 0);
}

export async function listarMovimientos(clienteId: string): Promise<MovimientoPuntos[]> {
  const { data, error } = await supabase
    .from('puntos_movimientos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('creado_en', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapearMovimiento);
}

// Se llama al marcar un pedido 'Entregado'. El índice único parcial
// idx_puntos_movimientos_pedido_acreditacion (ver supabase_migrations.sql,
// sección 19) rechaza una segunda acreditación del mismo pedido — acá se
// swallowea ese caso puntual (23505) porque el fin ya está cumplido
// (el pedido ya tiene sus puntos acreditados), no es un error real.
export async function acreditarPuntos(pedidoId: string, clienteId: string, puntos: number): Promise<void> {
  const { error } = await supabase.rpc('acreditar_puntos_pedido', {
    p_pedido_id:  pedidoId,
    p_cliente_id: clienteId,
    p_puntos:     puntos,
  });

  if (error && error.code !== '23505') throw error;
}

export async function acreditarManual(clienteId: string, puntos: number, motivo: string | null): Promise<number> {
  const { data, error } = await supabase.rpc('acreditar_puntos_manual', {
    p_cliente_id: clienteId,
    p_puntos:     puntos,
    p_motivo:     motivo,
  });

  if (error || data == null) {
    if (error?.message?.includes('perfil_no_encontrado')) {
      throw new AppError('El cliente no tiene un perfil registrado.', 404, 'CLIENTE_NOT_FOUND');
    }
    throw error ?? new Error('Error al acreditar los puntos');
  }

  return Number(data);
}

export async function canjear(clienteId: string, premioId: string): Promise<CanjePremio> {
  const { data, error } = await supabase.rpc('canjear_premio', {
    p_cliente_id: clienteId,
    p_premio_id:  premioId,
  });

  if (error || !data) {
    if (error?.message?.includes('saldo_insuficiente') || error?.message?.includes('perfil_no_encontrado')) {
      throw new AppError('No tenés puntos suficientes para canjear este premio.', 400, 'SALDO_INSUFICIENTE');
    }
    if (error?.message?.includes('premio_sin_stock')) {
      throw new AppError('Este premio ya no tiene stock disponible.', 409, 'PREMIO_SIN_STOCK');
    }
    if (error?.message?.includes('premio_invalido')) {
      throw new AppError('Este premio ya no está disponible.', 404, 'PREMIO_NOT_FOUND');
    }
    throw error ?? new Error('Error al canjear el premio');
  }

  return mapearCanje(data as Record<string, unknown>);
}

export async function listarPremios(soloActivos: boolean): Promise<Premio[]> {
  let query = supabase.from('premios').select('*').order('costo_puntos', { ascending: true });
  if (soloActivos) query = query.eq('activo', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapearPremio);
}

export async function encontrarPremioPorId(id: string): Promise<Premio | null> {
  const { data, error } = await supabase
    .from('premios')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearPremio(data);
}

export async function crearPremio(dto: CrearPremioDTO): Promise<Premio> {
  const { data, error } = await supabase
    .from('premios')
    .insert(dto)
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Error al crear el premio');
  return mapearPremio(data);
}

export async function actualizarPremio(id: string, cambios: Record<string, unknown>): Promise<Premio | null> {
  const { data, error } = await supabase
    .from('premios')
    .update({ ...cambios, actualizado_en: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) return null;
  return mapearPremio(data);
}

export async function listarCanjesAdmin(): Promise<CanjePremioConDetalle[]> {
  const { data, error } = await supabase
    .from('canjes_premio')
    .select('*, premios(nombre)')
    .order('canjeado_en', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(row => ({
    ...mapearCanje(row),
    premio_nombre: (row.premios as { nombre: string } | null)?.nombre ?? '—',
  }));
}
