import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProductos } from '../hooks/useProductos';
import { fetchProductos, fetchCategorias, fetchCategoriasArbol } from '../api/productos.api';
import type { Categoria } from '../types';
import { ProductGrid } from '../components/products/ProductGrid';
import { FiltrosSidebar } from '../components/products/FiltrosSidebar';
import { HeroCarousel } from '../components/home/HeroCarousel';

type Ordenar = 'nombre_asc' | 'nombre_desc' | 'precio_asc' | 'precio_desc' | undefined;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | undefined>(
    searchParams.get('categoria') ?? undefined
  );
  const [busqueda, setBusqueda] = useState<string | undefined>(
    searchParams.get('busqueda') ?? undefined
  );
  const [ordenar, setOrdenar] = useState<Ordenar>(
    (searchParams.get('ordenar') as Ordenar) ?? undefined
  );
  const [enOferta, setEnOferta] = useState(searchParams.get('en_oferta') === 'true');
  const [categoriasFacet, setCategoriasFacet] = useState<string[]>(
    searchParams.get('categorias')?.split(',').filter(Boolean) ?? []
  );
  const [pagina, setPagina] = useState(1);

  const [categoriasRaiz, setCategoriasRaiz] = useState<Categoria[]>([]);
  const [categoriaNombre, setCategoriaNombre] = useState<string | undefined>(undefined);
  const [precioBounds, setPrecioBounds] = useState<{ min: number; max: number } | null>(null);
  const [precioSeleccionado, setPrecioSeleccionado] = useState<[number, number]>([0, 0]);

  const mostrarFiltros = !!busqueda || !!categoriaSeleccionada;

  // Resincroniza el estado local cada vez que cambia la URL (back/forward, links, etc.)
  useEffect(() => {
    setCategoriaSeleccionada(searchParams.get('categoria') ?? undefined);
    setBusqueda(searchParams.get('busqueda') ?? undefined);
    setOrdenar((searchParams.get('ordenar') as Ordenar) ?? undefined);
    setEnOferta(searchParams.get('en_oferta') === 'true');
    setCategoriasFacet(searchParams.get('categorias')?.split(',').filter(Boolean) ?? []);
    setPagina(1);
  }, [searchParams]);

  // Categorías raíz para los checkboxes (se cargan una sola vez)
  useEffect(() => {
    fetchCategoriasArbol().then(setCategoriasRaiz).catch(() => setCategoriasRaiz([]));
  }, []);

  // Nombre de la categoría activa (cuando se navega por categoría puntual, no por búsqueda)
  useEffect(() => {
    if (!categoriaSeleccionada) {
      setCategoriaNombre(undefined);
      return;
    }
    fetchCategorias()
      .then(cats => setCategoriaNombre(cats.find(c => c.id === categoriaSeleccionada)?.nombre))
      .catch(() => setCategoriaNombre(undefined));
  }, [categoriaSeleccionada]);

  const categoriasFacetKey = categoriasFacet.join(',');

  // Topes dinámicos del slider de precio, según el contexto actual (búsqueda/categoría/oferta),
  // sin depender del rango de precio ya elegido (evitaría que el slider se recalcule sobre sí mismo).
  useEffect(() => {
    if (!mostrarFiltros) return;
    let cancelado = false;
    const contexto = {
      categoria: categoriaSeleccionada,
      categorias: categoriasFacetKey || undefined,
      busqueda,
      en_oferta: enOferta || undefined,
    };

    Promise.all([
      fetchProductos({ ...contexto, ordenar: 'precio_asc', limite: 1 }),
      fetchProductos({ ...contexto, ordenar: 'precio_desc', limite: 1 }),
    ]).then(([masBarato, masCaro]) => {
      if (cancelado) return;
      const min = masBarato.datos[0]?.precio ?? 0;
      const max = Math.max(masCaro.datos[0]?.precio ?? 0, min);
      setPrecioBounds({ min, max });

      const urlMin = Number(searchParams.get('precio_min'));
      const urlMax = Number(searchParams.get('precio_max'));
      setPrecioSeleccionado([
        Number.isFinite(urlMin) && urlMin > min ? urlMin : min,
        Number.isFinite(urlMax) && urlMax > 0 && urlMax < max ? urlMax : max,
      ]);
    }).catch(() => {
      if (!cancelado) setPrecioBounds(null);
    });

    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarFiltros, categoriaSeleccionada, busqueda, categoriasFacetKey, enOferta]);

  const { productos, total, totalPaginas, cargando, error } = useProductos({
    categoria: categoriaSeleccionada,
    categorias: categoriasFacetKey || undefined,
    busqueda,
    en_oferta: enOferta || undefined,
    precio_min: precioBounds && precioSeleccionado[0] > precioBounds.min ? precioSeleccionado[0] : undefined,
    precio_max: precioBounds && precioSeleccionado[1] < precioBounds.max ? precioSeleccionado[1] : undefined,
    pagina,
    limite: 12,
    ordenar,
  });

  function construirParams(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (busqueda) base.busqueda = busqueda;
    if (categoriaSeleccionada) base.categoria = categoriaSeleccionada;
    if (ordenar) base.ordenar = ordenar;
    if (enOferta) base.en_oferta = 'true';
    if (categoriasFacet.length) base.categorias = categoriasFacet.join(',');
    if (precioBounds && precioSeleccionado[0] > precioBounds.min) base.precio_min = String(precioSeleccionado[0]);
    if (precioBounds && precioSeleccionado[1] < precioBounds.max) base.precio_max = String(precioSeleccionado[1]);

    for (const [clave, valor] of Object.entries(overrides)) {
      if (valor === undefined) delete base[clave];
      else base[clave] = valor;
    }
    return base;
  }

  function handleCambiarPrecio(min: number, max: number) {
    setPrecioSeleccionado([min, max]);
    setSearchParams(construirParams({
      precio_min: precioBounds && min > precioBounds.min ? String(min) : undefined,
      precio_max: precioBounds && max < precioBounds.max ? String(max) : undefined,
    }));
  }

  function handleToggleCategoriaFacet(id: string) {
    const nuevas = categoriasFacet.includes(id)
      ? categoriasFacet.filter(c => c !== id)
      : [...categoriasFacet, id];
    setSearchParams(construirParams({ categorias: nuevas.length ? nuevas.join(',') : undefined }));
  }

  function handleToggleEnOferta() {
    setSearchParams(construirParams({ en_oferta: enOferta ? undefined : 'true' }));
  }

  const titulo = useMemo(() => {
    if (busqueda) return `Resultados para "${busqueda}"`;
    if (categoriaNombre) return categoriaNombre;
    return 'Todos los productos';
  }, [busqueda, categoriaNombre]);

  const contenidoPrincipal = (
    <>
      <div className="sort-bar">
        <span className="sort-bar__label">Ordenar por:</span>
        <select
          className="sort-select"
          value={ordenar ?? ''}
          onChange={e => setSearchParams(construirParams({ ordenar: e.target.value || undefined }))}
        >
          <option value="">Más recientes</option>
          <option value="nombre_asc">Nombre A-Z</option>
          <option value="nombre_desc">Nombre Z-A</option>
          <option value="precio_asc">Precio ascendente</option>
          <option value="precio_desc">Precio descendente</option>
        </select>
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
    </>
  );

  return (
    <>
      <HeroCarousel />
      <div className="page">
        {mostrarFiltros ? (
          <div className="catalog-layout">
            <aside>
              <FiltrosSidebar
                titulo={titulo}
                esBusqueda={!!busqueda}
                onLimpiarBusqueda={() => setSearchParams(categoriaSeleccionada ? { categoria: categoriaSeleccionada } : {})}
                total={total}
                precioMin={precioBounds?.min ?? 0}
                precioMax={precioBounds?.max ?? 0}
                precioSeleccionado={precioSeleccionado}
                onCambiarPrecio={handleCambiarPrecio}
                categoriasRaiz={categoriasRaiz}
                categoriasSeleccionadas={categoriasFacet}
                onToggleCategoria={handleToggleCategoriaFacet}
                enOferta={enOferta}
                onToggleEnOferta={handleToggleEnOferta}
              />
            </aside>
            <div className="catalog-main">{contenidoPrincipal}</div>
          </div>
        ) : (
          contenidoPrincipal
        )}
      </div>
    </>
  );
}
