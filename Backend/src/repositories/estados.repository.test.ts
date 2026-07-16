import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Estado } from '../types';

const { fromMock, selectMock, orderMock } = vi.hoisted(() => {
  const orderMock = vi.fn();
  const selectMock = vi.fn(() => ({ order: orderMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return { fromMock, selectMock, orderMock };
});

vi.mock('../config/supabase', () => ({ supabase: { from: fromMock } }));

import {
  precargarCache,
  listarTodos,
  getIdByNombre,
  getNombreById,
  _resetCacheParaTests,
} from './estados.repository';

const FILAS: Estado[] = [
  { id: 1, nombre: 'PendienteDePago', descripcion: null, es_final: false, orden: 1, creado_en: '2026-01-01T00:00:00Z' },
  { id: 2, nombre: 'Confirmado',      descripcion: null, es_final: false, orden: 2, creado_en: '2026-01-01T00:00:00Z' },
  { id: 7, nombre: 'Cancelado',       descripcion: null, es_final: true,  orden: 7, creado_en: '2026-01-01T00:00:00Z' },
];

beforeEach(() => {
  _resetCacheParaTests();
  fromMock.mockClear();
  selectMock.mockClear();
  orderMock.mockReset();
  orderMock.mockResolvedValue({ data: FILAS, error: null });
});

describe('precargarCache', () => {
  it('carga el catálogo desde supabase', async () => {
    const filas = await precargarCache();
    expect(filas).toEqual(FILAS);
    expect(fromMock).toHaveBeenCalledWith('estados');
  });

  it('memoiza: llamadas repetidas no vuelven a pegarle a supabase', async () => {
    await precargarCache();
    await precargarCache();
    await listarTodos();
    expect(orderMock).toHaveBeenCalledTimes(1);
  });

  it('dedupea cargas concurrentes', async () => {
    const [a, b] = await Promise.all([precargarCache(), precargarCache()]);
    expect(a).toEqual(b);
    expect(orderMock).toHaveBeenCalledTimes(1);
  });

  it('tira error si la tabla viene vacía', async () => {
    orderMock.mockResolvedValue({ data: [], error: null });
    await expect(precargarCache()).rejects.toThrow('catálogo de estados está vacío');
  });

  it('propaga el error de supabase', async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(precargarCache()).rejects.toThrow('No se pudo cargar el catálogo de estados');
  });
});

describe('getIdByNombre / getNombreById', () => {
  it('resuelven nombre <-> id tras precargar la caché', async () => {
    await precargarCache();
    expect(getIdByNombre('Confirmado')).toBe(2);
    expect(getNombreById(7)).toBe('Cancelado');
  });

  it('tiran AppError si se llaman antes de precargar la caché', () => {
    expect(() => getIdByNombre('Confirmado')).toThrow('Catálogo de estados no inicializado');
    expect(() => getNombreById(1)).toThrow('Catálogo de estados no inicializado');
  });

  it('tiran AppError ante un nombre o id desconocido', async () => {
    await precargarCache();
    expect(() => getIdByNombre('EnPreparacion')).toThrow("Estado desconocido en el catálogo: 'EnPreparacion'");
    expect(() => getNombreById(99)).toThrow('estado_id desconocido en el catálogo: 99');
  });
});
