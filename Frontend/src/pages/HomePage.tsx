import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProductos } from '../hooks/useProductos';
import { useCategorias } from '../hooks/useCategorias';
import { ProductFilters } from '../components/products/ProductFilters';
import { ProductGrid } from '../components/products/ProductGrid';

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | undefined>(
    searchParams.get('categoria') ?? undefined
  );
  const [busqueda, setBusqueda] = useState<string | undefined>(
    searchParams.get('busqueda') ?? undefined
  );
  const [pagina, setPagina] = useState(1);
  const [ordenar, setOrdenar] = useState<'nombre_asc' | 'nombre_desc' | 'precio_asc' | 'precio_desc' | undefined>(undefined);

  // Sincronizar con cambios en la URL (navegación desde header/nav)
  useEffect(() => {
    setCategoriaSeleccionada(searchParams.get('categoria') ?? undefined);
    setBusqueda(searchParams.get('busqueda') ?? undefined);
    setPagina(1);
    setOrdenar(undefined);
  }, [searchParams]);

  const handleCambiarCategoria = (slug: string | undefined) => {
    const params: Record<string, string> = {};
    if (slug) params.categoria = slug;
    if (busqueda) params.busqueda = busqueda;
    setSearchParams(params);
  };

  const { productos, totalPaginas, cargando, error } = useProductos({
    categoria: categoriaSeleccionada,
    busqueda,
    pagina,
    limite: 12,
    ordenar,
  });

  const { categorias } = useCategorias();

  return (
    <div className="page">
      {busqueda && (
        <p className="search-result-label">
          Resultados para: <strong>"{busqueda}"</strong>
          <button
            className="search-result-clear"
            onClick={() => setSearchParams(categoriaSeleccionada ? { categoria: categoriaSeleccionada } : {})}
          >
            ✕ Limpiar
          </button>
        </p>
      )}
      {busqueda && (
        <div className="sort-bar">
          <span className="sort-bar__label">Ordenar por:</span>
          <select
            className="sort-select"
            value={ordenar ?? ''}
            onChange={e => {
              setOrdenar((e.target.value || undefined) as typeof ordenar);
              setPagina(1);
            }}
          >
            <option value="">Más recientes</option>
            <option value="nombre_asc">Nombre A-Z</option>
            <option value="nombre_desc">Nombre Z-A</option>
            <option value="precio_asc">Precio ascendente</option>
            <option value="precio_desc">Precio descendente</option>
          </select>
        </div>
      )}
      <ProductFilters
        categorias={categorias}
        categoriaSeleccionada={categoriaSeleccionada}
        onCambiarCategoria={handleCambiarCategoria}
      />
      <ProductGrid productos={productos} cargando={cargando} error={error} />
      {totalPaginas > 1 && (
        <div className="pagination">
          <button className="btn btn--ghost" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
            ← Anterior
          </button>
          <span className="pagination__info">Página {pagina} de {totalPaginas}</span>
          <button className="btn btn--ghost" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
