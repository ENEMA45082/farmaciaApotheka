import { useState, useEffect, useCallback } from 'react';
import { fetchCategoriasPaginadas } from '../api/productos.api';
import type { FiltrosCategoria } from '../api/productos.api';
import type { Categoria } from '../types';

interface EstadoCategoriasPaginadas {
  categorias: Categoria[];
  total: number;
  totalPaginas: number;
  cargando: boolean;
  error: string | null;
}

export function useCategoriasPaginadas(filtros: FiltrosCategoria) {
  const [estado, setEstado] = useState<EstadoCategoriasPaginadas>({
    categorias: [],
    total: 0,
    totalPaginas: 0,
    cargando: true,
    error: null,
  });

  const filtrosKey = JSON.stringify(filtros);

  const cargar = useCallback(async () => {
    setEstado(prev => ({ ...prev, cargando: true, error: null }));
    try {
      const resultado = await fetchCategoriasPaginadas(JSON.parse(filtrosKey));
      setEstado({
        categorias: resultado.datos,
        total: resultado.total,
        totalPaginas: resultado.totalPaginas,
        cargando: false,
        error: null,
      });
    } catch {
      setEstado(prev => ({
        ...prev,
        cargando: false,
        error: 'Error al cargar las categorías',
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosKey]);

  useEffect(() => { cargar(); }, [cargar]);

  return { ...estado, recargar: cargar };
}
