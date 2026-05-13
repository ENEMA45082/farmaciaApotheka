import { useState, useEffect, useCallback } from 'react';
import { fetchProductos } from '../api/productos.api';
import type { FiltrosProducto } from '../api/productos.api';
import type { Producto } from '../types';

interface EstadoProductos {
  productos: Producto[];
  total: number;
  totalPaginas: number;
  cargando: boolean;
  error: string | null;
}

export function useProductos(filtros: FiltrosProducto) {
  const [estado, setEstado] = useState<EstadoProductos>({
    productos: [],
    total: 0,
    totalPaginas: 0,
    cargando: true,
    error: null,
  });

  const filtrosKey = JSON.stringify(filtros);

  const cargar = useCallback(async () => {
    setEstado(prev => ({ ...prev, cargando: true, error: null }));
    try {
      const resultado = await fetchProductos(JSON.parse(filtrosKey));
      setEstado({
        productos: resultado.datos,
        total: resultado.total,
        totalPaginas: resultado.totalPaginas,
        cargando: false,
        error: null,
      });
    } catch {
      setEstado(prev => ({
        ...prev,
        cargando: false,
        error: 'Error al cargar los productos',
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosKey]);

  useEffect(() => { cargar(); }, [cargar]);

  return { ...estado, recargar: cargar };
}
