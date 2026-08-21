import { useState, useEffect, useCallback } from 'react';
import { fetchProductosDestacados } from '../api/productosDestacados.api';
import type { ProductoDestacado } from '../types';

export function useProductosDestacados() {
  const [productosDestacados, setProductosDestacados] = useState<ProductoDestacado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    fetchProductosDestacados()
      .then(setProductosDestacados)
      .catch(() => setError('Error al cargar los productos del carrusel'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { productosDestacados, cargando, error, recargar: cargar };
}
