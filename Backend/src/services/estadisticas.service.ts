import { supabase } from '../config/supabase';

interface RawProducto {
  id: string;
  precio: number;
  en_oferta: boolean;
  precio_oferta: number | null;
  porcentaje_oferta: number | null;
  stock: number;
  fecha_vencimiento: string | null;
  categoria_id: string | null;
}

interface RawCategoria {
  id: string;
  nombre: string;
  id_padre: string | null;
}

function encontrarCategoriaRaiz(
  catId: string | null,
  mapa: Map<string, RawCategoria>,
): RawCategoria | null {
  if (!catId) return null;
  const cat = mapa.get(catId);
  if (!cat) return null;
  if (!cat.id_padre) return cat;
  return encontrarCategoriaRaiz(cat.id_padre, mapa);
}

export async function obtenerEstadisticas() {
  const [{ data: productos }, { data: categorias }] = await Promise.all([
    supabase
      .from('products')
      .select('id, precio, en_oferta, precio_oferta, porcentaje_oferta, stock, fecha_vencimiento, categoria_id'),
    supabase
      .from('categories')
      .select('id, nombre, id_padre'),
  ]);

  const prods = (productos ?? []) as RawProducto[];
  const cats  = (categorias ?? []) as RawCategoria[];
  const catMapa = new Map(cats.map(c => [c.id, c]));

  const hoy      = new Date();
  const en30dias = new Date(hoy);
  en30dias.setDate(hoy.getDate() + 30);

  // ── Resumen ────────────────────────────────────────────────────────────────
  const totalProductos   = prods.length;
  const totalStock       = prods.reduce((s, p) => s + p.stock, 0);
  const valorInventario  = prods.reduce((s, p) => s + p.precio * p.stock, 0);
  const productosEnOferta = prods.filter(p => p.en_oferta).length;
  const productosSinStock = prods.filter(p => p.stock === 0).length;
  const proximosAVencer   = prods.filter(p => {
    if (!p.fecha_vencimiento) return false;
    const v = new Date(p.fecha_vencimiento);
    return v >= hoy && v <= en30dias;
  }).length;
  const ahorroOferta = prods
    .filter(p => p.en_oferta && p.precio_oferta !== null)
    .reduce((s, p) => s + (p.precio - (p.precio_oferta ?? 0)) * p.stock, 0);

  // ── Por categoría raíz ─────────────────────────────────────────────────────
  const porCatMap = new Map<string, {
    nombre: string;
    totalProductos: number;
    totalStock: number;
    valorInventario: number;
  }>();

  for (const p of prods) {
    const raiz  = encontrarCategoriaRaiz(p.categoria_id, catMapa);
    const nombre = raiz?.nombre ?? 'Sin categoría';

    if (!porCatMap.has(nombre)) {
      porCatMap.set(nombre, { nombre, totalProductos: 0, totalStock: 0, valorInventario: 0 });
    }
    const entry = porCatMap.get(nombre)!;
    entry.totalProductos  += 1;
    entry.totalStock      += p.stock;
    entry.valorInventario += p.precio * p.stock;
  }

  const porCategoria = Array.from(porCatMap.values())
    .sort((a, b) => b.totalProductos - a.totalProductos);

  // ── Distribución de precios ────────────────────────────────────────────────
  const rangos = [
    { label: '< $500',           min: 0,     max: 499      },
    { label: '$500 - $1.000',    min: 500,   max: 999      },
    { label: '$1.000 - $2.500',  min: 1000,  max: 2499     },
    { label: '$2.500 - $5.000',  min: 2500,  max: 4999     },
    { label: '$5.000 - $10.000', min: 5000,  max: 9999     },
    { label: '> $10.000',        min: 10000, max: Infinity  },
  ];
  const distribucionPrecios = rangos.map(r => ({
    rango:    r.label,
    cantidad: prods.filter(p => p.precio >= r.min && p.precio <= r.max).length,
  }));

  // ── Vencimientos por mes (próximos 6 meses) ───────────────────────────────
  const vencimientosPorMes = Array.from({ length: 6 }, (_, i) => {
    const d     = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    const label = d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
    const cantidad = prods.filter(p => {
      if (!p.fecha_vencimiento) return false;
      const v = new Date(p.fecha_vencimiento);
      return v.getFullYear() === d.getFullYear() && v.getMonth() === d.getMonth();
    }).length;
    return { mes: label, cantidad };
  });

  // ── Oferta vs normal ───────────────────────────────────────────────────────
  const ofertaVsNormal = {
    enOferta: productosEnOferta,
    normal:   totalProductos - productosEnOferta,
  };

  // ── Descuento promedio ─────────────────────────────────────────────────────
  const prodsConDescuento = prods.filter(p => p.en_oferta && p.porcentaje_oferta !== null);
  const descuentoPromedio = prodsConDescuento.length > 0
    ? prodsConDescuento.reduce((s, p) => s + (p.porcentaje_oferta ?? 0), 0) / prodsConDescuento.length
    : 0;

  return {
    resumen: {
      totalProductos,
      totalStock,
      valorInventario,
      productosEnOferta,
      productosSinStock,
      proximosAVencer,
      totalCategorias: cats.length,
      ahorroOferta,
    },
    porCategoria,
    distribucionPrecios,
    vencimientosPorMes,
    ofertaVsNormal,
    descuentoPromedio,
  };
}
