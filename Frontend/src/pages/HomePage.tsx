import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useProductos } from '../hooks/useProductos';
import { fetchProductos, fetchCategorias, fetchCategoriasArbol } from '../api/productos.api';
import type { Categoria } from '../types';
import { ProductGrid } from '../components/products/ProductGrid';
import { HeroCarousel } from '../components/home/HeroCarousel';
import { BeneficiosBar } from '../components/home/BeneficiosBar';
import { ProductosDestacadosCarousel } from '../components/home/ProductosDestacadosCarousel';
import { MediosDePago } from '../components/home/MediosDePago';
import { PromoBanners } from '../components/home/PromoBanners';
import { CategoriasMasVistas } from '../components/home/CategoriasMasVistas';
import { SortSelect } from '../components/ui/SortSelect';
import { Spinner } from '../components/ui/Spinner';
import { slugify } from '../utils/slug';
import { overlayVariants } from '../components/ui/motion';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// FiltrosSidebar carga rc-slider (+ su CSS): solo se usa acá, se saca del
// bundle inicial de la home vía import dinámico.
const FiltrosSidebar = lazy(() => import('../components/products/FiltrosSidebar').then(m => ({ default: m.FiltrosSidebar })));

const OPCIONES_ORDEN = [
  { value: '', label: 'Más recientes' },
  { value: 'nombre_asc', label: 'Nombre A-Z' },
  { value: 'nombre_desc', label: 'Nombre Z-A' },
  { value: 'precio_asc', label: 'Precio ascendente' },
  { value: 'precio_desc', label: 'Precio descendente' },
];

type Ordenar = 'nombre_asc' | 'nombre_desc' | 'precio_asc' | 'precio_desc' | undefined;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

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
  const [categoriasFlat, setCategoriasFlat] = useState<Categoria[]>([]);
  const [precioBounds, setPrecioBounds] = useState<{ min: number; max: number } | null>(null);
  const [precioSeleccionado, setPrecioSeleccionado] = useState<[number, number]>([0, 0]);
  const [filtrosMovilAbierto, setFiltrosMovilAbierto] = useState(false);
  useBodyScrollLock(filtrosMovilAbierto);

  // Categoría activa: por slug (ruta /categoria/:slug) o, para compatibilidad
  // con links viejos, por uuid en ?categoria= (query param que se usaba antes
  // de tener rutas por path).
  const categoriaActiva = useMemo(() => {
    if (!categoriasFlat.length) return undefined;
    if (slug) return categoriasFlat.find(c => slugify(c.nombre) === slug);
    const uuidLegacy = searchParams.get('categoria');
    if (uuidLegacy) return categoriasFlat.find(c => c.id === uuidLegacy);
    return undefined;
  }, [categoriasFlat, slug, searchParams]);

  const mostrarFiltros = !!busqueda || !!categoriaActiva;

  // A diferencia de mostrarFiltros (que depende de categoriaActiva, resuelta
  // recién cuando categoriasFlat termina de cargar), esto se calcula solo con
  // datos ya disponibles en el primer render: slug/busqueda/categoria vienen
  // de la URL, no de un fetch. HomePage se remonta entero en cada navegación
  // (AnimatedRoutes en App.tsx usa key={location.pathname}), así que si
  // Hero/Destacados dependieran de mostrarFiltros, alcanzaban a montarse (y a
  // disparar sus fetches de banners/productos en oferta) durante ese primer
  // render, antes de que categoriaActiva resolviera y los desmontara.
  const esHome = !busqueda && !slug && !searchParams.get('categoria');

  // Resincroniza el estado local cada vez que cambia la URL (back/forward, links, etc.)
  useEffect(() => {
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

  // Lista plana de categorías, para resolver slug/uuid -> categoría activa
  useEffect(() => {
    fetchCategorias().then(setCategoriasFlat).catch(() => setCategoriasFlat([]));
  }, []);

  // Compat: si la categoría se resolvió por el ?categoria=uuid viejo (no por
  // /categoria/:slug), canonicaliza la URL a la ruta nueva sin perder el
  // resto de los query params.
  useEffect(() => {
    const uuidLegacy = searchParams.get('categoria');
    if (slug || !uuidLegacy || !categoriaActiva) return;
    const nuevosParams = new URLSearchParams(searchParams);
    nuevosParams.delete('categoria');
    const queryString = nuevosParams.toString();
    navigate(`/categoria/${slugify(categoriaActiva.nombre)}${queryString ? `?${queryString}` : ''}`, { replace: true });
  }, [slug, categoriaActiva, searchParams, navigate]);

  // Slug en la ruta que no matchea ninguna categoría (link roto/typo): volver a la home
  useEffect(() => {
    if (slug && categoriasFlat.length && !categoriaActiva) {
      navigate('/', { replace: true });
    }
  }, [slug, categoriasFlat, categoriaActiva, navigate]);

  const categoriasFacetKey = categoriasFacet.join(',');

  // Topes dinámicos del slider de precio, según el contexto actual (búsqueda/categoría/oferta),
  // sin depender del rango de precio ya elegido (evitaría que el slider se recalcule sobre sí mismo).
  useEffect(() => {
    if (!mostrarFiltros) return;
    let cancelado = false;
    const contexto = {
      categoria: categoriaActiva?.id,
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
  }, [mostrarFiltros, categoriaActiva, busqueda, categoriasFacetKey, enOferta]);

  const { productos, total, totalPaginas, cargando, error } = useProductos({
    categoria: categoriaActiva?.id,
    categorias: categoriasFacetKey || undefined,
    busqueda,
    en_oferta: enOferta || undefined,
    precio_min: precioBounds && precioSeleccionado[0] > precioBounds.min ? precioSeleccionado[0] : undefined,
    precio_max: precioBounds && precioSeleccionado[1] < precioBounds.max ? precioSeleccionado[1] : undefined,
    pagina,
    limite: 20,
    ordenar,
  });

  function construirParams(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (busqueda) base.busqueda = busqueda;
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

  function handleLimpiarFiltros() {
    setSearchParams(construirParams({
      categorias: undefined,
      en_oferta: undefined,
      precio_min: undefined,
      precio_max: undefined,
    }));
  }

  const titulo = useMemo(() => {
    if (busqueda) return `Resultados para "${busqueda}"`;
    if (categoriaActiva) return categoriaActiva.nombre;
    return 'Todos los productos';
  }, [busqueda, categoriaActiva]);

  const cantidadFiltrosActivos = useMemo(() => {
    const precioActivo = precioBounds != null && (
      precioSeleccionado[0] > precioBounds.min || precioSeleccionado[1] < precioBounds.max
    );
    return categoriasFacet.length + (enOferta ? 1 : 0) + (precioActivo ? 1 : 0);
  }, [categoriasFacet, enOferta, precioBounds, precioSeleccionado]);

  const contenidoPrincipal = (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2.5 py-2">
        <span className="text-sm font-semibold whitespace-nowrap text-ink">Ordenar por:</span>
        <SortSelect
          value={ordenar ?? ''}
          onChange={value => setSearchParams(construirParams({ ordenar: value || undefined }))}
          opciones={OPCIONES_ORDEN}
        />
        {mostrarFiltros && (
          <button
            className="ml-auto hidden items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-navy max-[768px]:flex"
            onClick={() => setFiltrosMovilAbierto(true)}
          >
            Filtros
            {cantidadFiltrosActivos > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-navy px-1 text-xs font-extrabold text-white">
                {cantidadFiltrosActivos}
              </span>
            )}
          </button>
        )}
      </div>

      <ProductGrid productos={productos} cargando={cargando} error={error} />

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-4 py-6">
          <button
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-40"
            disabled={pagina <= 1}
            onClick={() => setPagina(p => p - 1)}
          >
            ← Anterior
          </button>
          <span className="text-sm text-muted">Página {pagina} de {totalPaginas}</span>
          <button
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-40"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina(p => p + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {esHome && <div className="home-hero-wrap"><HeroCarousel /></div>}
      <div className="home-hero-wrap"><BeneficiosBar /></div>
      {esHome && <div className="home-hero-wrap"><ProductosDestacadosCarousel /></div>}
      <div className="home-hero-wrap"><MediosDePago /></div>
      {esHome && <div className="home-hero-wrap"><PromoBanners /></div>}
      {esHome && <div className="home-hero-wrap"><CategoriasMasVistas /></div>}
      <div className="page">
        {mostrarFiltros ? (
          <div className="catalog-layout">
            <AnimatePresence>
              {filtrosMovilAbierto && (
                <motion.div
                  className="filtros-overlay"
                  variants={overlayVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  onClick={() => setFiltrosMovilAbierto(false)}
                />
              )}
            </AnimatePresence>
            <aside className={`filtros-drawer${filtrosMovilAbierto ? ' filtros-drawer--abierto' : ''}`}>
              <button
                className="filtros-drawer__cerrar"
                onClick={() => setFiltrosMovilAbierto(false)}
                aria-label="Cerrar filtros"
              >
                ✕
              </button>
              <Suspense fallback={<Spinner />}>
                <FiltrosSidebar
                  titulo={titulo}
                  esBusqueda={!!busqueda}
                  onLimpiarBusqueda={() => setSearchParams(construirParams({ busqueda: undefined }))}
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
                  filtrosActivos={cantidadFiltrosActivos}
                  onLimpiarFiltros={handleLimpiarFiltros}
                />
              </Suspense>
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
