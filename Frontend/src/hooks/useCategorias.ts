import { useState, useEffect, useCallback } from 'react';
import { fetchCategorias } from '../api/productos.api';
import type { Categoria } from '../types';

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    fetchCategorias()
      .then(setCategorias)
      .catch(() => setError('Error al cargar las categorías'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { categorias, cargando, error, recargar: cargar };
}
