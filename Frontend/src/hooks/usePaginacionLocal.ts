import { useMemo, useState } from 'react';

// Paginado en memoria para listas largas que ya están cargadas. Si la lista
// se achica (por un filtro) y la página actual deja de existir, se muestra la
// última; quien cambie el filtro debería llamar irA(1).
export function usePaginacionLocal<T>(items: T[], porPagina: number) {
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);

  const visibles = useMemo(
    () => items.slice((paginaActual - 1) * porPagina, paginaActual * porPagina),
    [items, paginaActual, porPagina],
  );

  return { pagina: paginaActual, totalPaginas, visibles, irA: setPagina };
}
