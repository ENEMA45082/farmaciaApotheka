import { useState, useEffect, useCallback } from 'react';
import { fetchCategoriasArbol } from '../api/productos.api';
import type { Categoria } from '../types';

export function useCategoriasArbol() {
  const [arbol, setArbol] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    fetchCategoriasArbol()
      .then(setArbol)
      .catch(() => setArbol([]))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { arbol, cargando };
}
