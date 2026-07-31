import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import type { Estado } from '../types';
import type { EstadoPedido } from '../config/estadosPedido';

let catalogo: Estado[] | null = null;
let porNombre = new Map<EstadoPedido, Estado>();
let porId = new Map<number, Estado>();
let cargaEnCurso: Promise<Estado[]> | null = null;

async function cargar(): Promise<Estado[]> {
  const { data, error } = await supabase
    .from('estados')
    .select('*')
    .order('orden', { ascending: true });

  if (error) throw new AppError(`No se pudo cargar el catálogo de estados: ${error.message}`, 500, 'ESTADOS_CATALOGO_ERROR');
  if (!data || data.length === 0) throw new AppError('El catálogo de estados está vacío', 500, 'ESTADOS_CATALOGO_VACIO');

  const filas = data as Estado[];
  catalogo = filas;
  porNombre = new Map(filas.map(e => [e.nombre, e]));
  porId = new Map(filas.map(e => [e.id, e]));
  return filas;
}

/**
 * Carga el catálogo en memoria si todavía no está cargado. Memoizada y con
 * dedup de cargas concurrentes: pensada para llamarse como middleware en
 * cada request (el backend corre serverless en Vercel, no hay un "boot"
 * único), pero solo pega contra Supabase una vez por instancia.
 */
export async function precargarCache(): Promise<Estado[]> {
  if (catalogo) return catalogo;
  if (!cargaEnCurso) {
    cargaEnCurso = cargar().catch(err => {
      cargaEnCurso = null;
      throw err;
    });
  }
  return cargaEnCurso;
}

export async function listarTodos(): Promise<Estado[]> {
  return precargarCache();
}

function requireCatalogo(): void {
  if (!catalogo) {
    throw new AppError(
      'Catálogo de estados no inicializado en memoria (falta llamar a precargarCache() antes de usar el cache)',
      500,
      'ESTADOS_CATALOGO_NO_INICIALIZADO',
    );
  }
}

export function getIdByNombre(nombre: EstadoPedido): number {
  requireCatalogo();
  const estado = porNombre.get(nombre);
  if (!estado) throw new AppError(`Estado desconocido en el catálogo: '${nombre}'`, 500, 'ESTADO_DESCONOCIDO');
  return estado.id;
}

export function getNombreById(id: number): EstadoPedido {
  requireCatalogo();
  const estado = porId.get(id);
  if (!estado) throw new AppError(`estado_id desconocido en el catálogo: ${id}`, 500, 'ESTADO_DESCONOCIDO');
  return estado.nombre;
}

/** Solo para tests: fuerza a recargar el caché en el próximo acceso. */
export function _resetCacheParaTests(): void {
  catalogo = null;
  porNombre = new Map();
  porId = new Map();
  cargaEnCurso = null;
}
