import { useState } from 'react';
import { useProductos } from '../hooks/useProductos';
import { ProductGrid } from '../components/products/ProductGrid';

export function OfertasPage() {
  const [pagina, setPagina] = useState(1);
  const [ordenar, setOrdenar] = useState<'precio_asc' | 'precio_desc' | 'nombre_asc' | 'nombre_desc' | undefined>(undefined);

  const { productos, totalPaginas, cargando, error } = useProductos({
    en_oferta: true,
    pagina,
    limite: 12,
    ordenar,
  });

  return (
    <div className="page">
      <div className="ofertas-header">
        <h1 className="ofertas-titulo">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" stroke="none" style={{ flexShrink: 0 }}>
            <path d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.42l9 9A2 2 0 0 0 13 22a2 2 0 0 0 1.41-.59l7-7A2 2 0 0 0 22 13a2 2 0 0 0-.59-1.42zM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8z"/>
          </svg>
          Ofertas
        </h1>

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
            <option value="precio_asc">Precio ascendente</option>
            <option value="precio_desc">Precio descendente</option>
            <option value="nombre_asc">Nombre A-Z</option>
            <option value="nombre_desc">Nombre Z-A</option>
          </select>
        </div>
      </div>

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
