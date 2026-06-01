import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProductos } from '../hooks/useProductos';
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

  useEffect(() => {
    setCategoriaSeleccionada(searchParams.get('categoria') ?? undefined);
    setBusqueda(searchParams.get('busqueda') ?? undefined);
    setPagina(1);
    setOrdenar(undefined);
  }, [searchParams]);

  const { productos, totalPaginas, cargando, error } = useProductos({
    categoria: categoriaSeleccionada,
    busqueda,
    pagina,
    limite: 12,
    ordenar,
  });

  return (
    <>
      <div className="hero-banner">
        <img
          src="/Captura de pantalla 2026-05-13 220208.png"
          alt="Promociones"
          className="hero-banner__img"
        />
      </div>
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
    </>
  );
}
