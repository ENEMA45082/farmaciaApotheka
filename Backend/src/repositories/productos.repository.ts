import { supabase } from '../config/supabase';
import { recopilarDescendientes } from '../utils/categoriaTree';
import { escaparPatronLike } from '../utils/escaparPatronLike';
import type {
  Producto,
  CrearProductoDTO,
  ActualizarProductoDTO,
  FiltrosProducto,
  ProductoParaImportacion,
} from '../types';

export function mapearProducto(row: Record<string, unknown>): Producto {
  return {
    id:                row.id as string,
    nombre:            row.nombre as string,
    descripcion:       row.descripcion as string | null,
    precio:            Number(row.precio),
    en_oferta:         Boolean(row.en_oferta),
    precio_oferta:     row.precio_oferta != null ? Number(row.precio_oferta) : null,
    porcentaje_oferta: row.porcentaje_oferta != null ? Number(row.porcentaje_oferta) : null,
    es_2x1:            Boolean(row.es_2x1),
    imagen_url:        row.imagen_url as string | null,
    categoria_id:      row.categoria_id as string | null,
    stock:             Number(row.stock),
    codigo_barras:     row.codigo_barras as string | null,
    fecha_vencimiento: row.fecha_vencimiento as string | null,
    imagenes:          (row.imagenes as string[]) ?? [],
    creado_en:         row.creado_en as string,
    es_venta_libre:    row.es_venta_libre !== false,
    peso_gramos:       Number(row.peso_gramos ?? 0),
    alicuota_iva:      Number(row.alicuota_iva ?? 21),
    es_combo:          Boolean(row.es_combo),
    categoria: row.categoria
      ? {
          id:       (row.categoria as Record<string, unknown>).id as string,
          nombre:   (row.categoria as Record<string, unknown>).nombre as string,
          id_padre: (row.categoria as Record<string, unknown>).id_padre as string | null,
          creado_en:(row.categoria as Record<string, unknown>).creado_en as string,
        }
      : undefined,
  };
}

// Stock "real" de un combo = MIN(FLOOR(stock_componente / cantidad_en_combo))
// sobre todos sus combo_items. Nunca se guarda sincronizado en products.stock
// — se recalcula acá, en 1 sola query batcheada por página de resultados
// (nunca 1 query por combo).
async function calcularStockCombos(comboIds: string[]): Promise<Map<string, number>> {
  if (comboIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('combo_items')
    .select('combo_id, cantidad, producto:products!combo_items_producto_id_fkey(stock)')
    .in('combo_id', comboIds);

  if (error) throw error;

  const disponiblesPorCombo = new Map<string, number[]>();
  for (const fila of (data ?? []) as unknown as { combo_id: string; cantidad: number; producto: { stock: number } | null }[]) {
    const stockComponente = Number(fila.producto?.stock ?? 0);
    const disponibles = Math.floor(stockComponente / Number(fila.cantidad));
    const lista = disponiblesPorCombo.get(fila.combo_id) ?? [];
    lista.push(disponibles);
    disponiblesPorCombo.set(fila.combo_id, lista);
  }

  // Un combo sin componentes configurados (o cuyo query no trajo filas)
  // computa stock 0 — no puede venderse hasta que se le carguen al menos
  // los componentes con stock real. Evita un caso especial para "combo
  // recién creado, todavía sin composición".
  return new Map(comboIds.map(id => {
    const valores = disponiblesPorCombo.get(id);
    return [id, valores && valores.length > 0 ? Math.min(...valores) : 0];
  }));
}

async function aplicarStockDeCombos(productos: Producto[]): Promise<void> {
  const comboIds = productos.filter(p => p.es_combo).map(p => p.id);
  if (comboIds.length === 0) return;
  const stockPorCombo = await calcularStockCombos(comboIds);
  for (const p of productos) {
    if (p.es_combo) p.stock = stockPorCombo.get(p.id) ?? 0;
  }
}

export async function encontrarTodos(filtros: FiltrosProducto): Promise<{ datos: Producto[]; total: number }> {
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const limite = Math.min(50, Math.max(1, filtros.limite ?? 12));
  const desde  = (pagina - 1) * limite;
  const hasta  = desde + limite - 1;

  let query = supabase
    .from('products')
    .select('*, categoria:categories(*)', { count: 'exact' });

  if (!filtros.adminMode) {
    query = query.eq('es_venta_libre', true);
  }

  const categoriaIds = [
    ...(filtros.categoria ? [filtros.categoria] : []),
    ...(filtros.categorias ? filtros.categorias.split(',').filter(Boolean) : []),
  ];
  if (categoriaIds.length > 0) {
    const { data: todasCats } = await supabase
      .from('categories')
      .select('id, id_padre');

    const todas = todasCats ?? [];
    const ids = [...new Set(categoriaIds.flatMap(id => recopilarDescendientes(id, todas)))];
    query = query.in('categoria_id', ids);
  }

  if (filtros.busqueda) {
    // "nombre ILIKE X OR categoria_id IN (...)" armado con dos lookups de
    // ids (seguros: .ilike()/.in() como argumentos, nunca como texto
    // interpolado) en vez de un .or(`nombre.ilike.%${busqueda}%,...`) a
    // mano — ese string es la sintaxis de filtros de PostgREST, no SQL, y
    // busqueda ahí adentro sin escapar dejaba inyectar condiciones nuevas
    // con una coma/paréntesis en el texto de búsqueda (ej: "stock.gt.0"
    // devolviendo 215 productos sin relación con la búsqueda, verificado en
    // vivo). Acá busqueda solo se usa como argumento de .ilike(), que
    // supabase-js sí codifica de forma segura.
    const patronBusqueda = `%${escaparPatronLike(filtros.busqueda)}%`;
    const [{ data: cats }, { data: prodsPorNombre }] = await Promise.all([
      supabase.from('categories').select('id').ilike('nombre', patronBusqueda),
      supabase.from('products').select('id').ilike('nombre', patronBusqueda),
    ]);

    const catIds = (cats ?? []).map((c: { id: string }) => c.id);
    const idsPorNombre = (prodsPorNombre ?? []).map((p: { id: string }) => p.id);

    let idsPorCategoria: string[] = [];
    if (catIds.length > 0) {
      const { data: prodsPorCategoria } = await supabase.from('products').select('id').in('categoria_id', catIds);
      idsPorCategoria = (prodsPorCategoria ?? []).map((p: { id: string }) => p.id);
    }

    // .in('id', []) devuelve correctamente 0 filas (verificado en vivo) —
    // no hace falta un caso especial para "no matcheó nada".
    query = query.in('id', [...new Set([...idsPorNombre, ...idsPorCategoria])]);
  }

  if (filtros.codigo_barras) {
    query = query.ilike('codigo_barras', `%${escaparPatronLike(filtros.codigo_barras)}%`);
  }

  if (filtros.en_oferta !== undefined) {
    query = query.eq('en_oferta', filtros.en_oferta);
  }

  if (filtros.precio_min !== undefined) query = query.gte('precio', filtros.precio_min);
  if (filtros.precio_max !== undefined) query = query.lte('precio', filtros.precio_max);
  // stock_min/stock_max filtran sobre la columna cruda products.stock, ANTES
  // del cálculo de aplicarStockDeCombos() de más abajo — para combos ese
  // valor crudo no se mantiene sincronizado, así que estos dos filtros no
  // son precisos para combos. Limitación aceptada: arreglarlo de raíz
  // requeriría una subquery agregada dentro del propio query de products,
  // mucho más compleja que el resto de este archivo.
  if (filtros.stock_min  !== undefined) query = query.gte('stock', filtros.stock_min);
  if (filtros.stock_max  !== undefined) query = query.lte('stock', filtros.stock_max);

  if (filtros.vencimiento_desde) query = query.gte('fecha_vencimiento', filtros.vencimiento_desde);
  if (filtros.vencimiento_hasta) query = query.lte('fecha_vencimiento', filtros.vencimiento_hasta);

  const ordenMap: Record<string, { column: string; ascending: boolean }> = {
    nombre_asc:  { column: 'nombre', ascending: true  },
    nombre_desc: { column: 'nombre', ascending: false },
    precio_asc:  { column: 'precio', ascending: true  },
    precio_desc: { column: 'precio', ascending: false },
  };
  const ord = filtros.ordenar ? ordenMap[filtros.ordenar] : null;
  query = ord
    ? query.order(ord.column, { ascending: ord.ascending })
    : query.order('creado_en', { ascending: false });

  const { data, error, count } = await query.range(desde, hasta);

  if (error) throw error;

  const datos = (data ?? []).map(mapearProducto);
  await aplicarStockDeCombos(datos);

  return {
    datos,
    total: count ?? 0,
  };
}

export async function encontrarPorCodigoBarras(codigoBarras: string): Promise<Producto | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categoria:categories(*)')
    .eq('codigo_barras', codigoBarras)
    .maybeSingle();

  if (error || !data) return null;
  return mapearProducto(data);
}

export async function encontrarPorId(id: string): Promise<Producto | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categoria:categories(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  const producto = mapearProducto(data);

  if (producto.es_combo) {
    const stockPorCombo = await calcularStockCombos([producto.id]);
    producto.stock = stockPorCombo.get(producto.id) ?? 0;
  }

  return producto;
}

export async function crear(dto: CrearProductoDTO): Promise<Producto> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      nombre:            dto.nombre,
      descripcion:       dto.descripcion ?? null,
      precio:            dto.precio,
      en_oferta:         dto.en_oferta         ?? false,
      precio_oferta:     dto.precio_oferta      ?? null,
      porcentaje_oferta: dto.porcentaje_oferta  ?? null,
      es_2x1:            dto.es_2x1             ?? false,
      imagen_url:        dto.imagen_url         ?? null,
      categoria_id:      dto.categoria_id       ?? null,
      stock:             dto.stock              ?? 0,
      codigo_barras:     dto.codigo_barras      ?? null,
      fecha_vencimiento: dto.fecha_vencimiento  ?? null,
      imagenes:          dto.imagenes           ?? [],
      es_venta_libre:    dto.es_venta_libre     ?? true,
      peso_gramos:       dto.peso_gramos        ?? 0,
      alicuota_iva:      dto.alicuota_iva       ?? 21,
      es_combo:          dto.es_combo           ?? false,
    })
    .select('*, categoria:categories(*)')
    .single();

  if (error || !data) throw error ?? new Error('Error al crear el producto');
  return mapearProducto(data);
}

export async function actualizar(id: string, dto: ActualizarProductoDTO): Promise<Producto | null> {
  const cambios: Record<string, unknown> = {};
  if (dto.nombre            !== undefined) cambios.nombre            = dto.nombre;
  if (dto.descripcion       !== undefined) cambios.descripcion       = dto.descripcion;
  if (dto.precio            !== undefined) cambios.precio            = dto.precio;
  if (dto.en_oferta         !== undefined) cambios.en_oferta         = dto.en_oferta;
  if (dto.precio_oferta     !== undefined) cambios.precio_oferta     = dto.precio_oferta;
  if (dto.porcentaje_oferta !== undefined) cambios.porcentaje_oferta = dto.porcentaje_oferta;
  if (dto.es_2x1            !== undefined) cambios.es_2x1            = dto.es_2x1;
  if (dto.imagen_url        !== undefined) cambios.imagen_url        = dto.imagen_url;
  if (dto.categoria_id      !== undefined) cambios.categoria_id      = dto.categoria_id;
  if (dto.stock             !== undefined) cambios.stock             = dto.stock;
  if (dto.codigo_barras     !== undefined) cambios.codigo_barras     = dto.codigo_barras;
  if (dto.fecha_vencimiento !== undefined) cambios.fecha_vencimiento = dto.fecha_vencimiento;
  if (dto.imagenes          !== undefined) cambios.imagenes          = dto.imagenes;
  if (dto.es_venta_libre   !== undefined) cambios.es_venta_libre   = dto.es_venta_libre;
  if (dto.peso_gramos      !== undefined) cambios.peso_gramos      = dto.peso_gramos;
  if (dto.alicuota_iva     !== undefined) cambios.alicuota_iva     = dto.alicuota_iva;
  if (dto.es_combo         !== undefined) cambios.es_combo         = dto.es_combo;

  const { data, error } = await supabase
    .from('products')
    .update(cambios)
    .eq('id', id)
    .select('*, categoria:categories(*)')
    .single();

  if (error || !data) return null;
  return mapearProducto(data);
}

export async function eliminar(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  return !error;
}

export async function contarPorCategorias(categoriaIds: string[]): Promise<number> {
  if (categoriaIds.length === 0) return 0;

  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .in('categoria_id', categoriaIds);

  if (error) throw error;
  return count ?? 0;
}

const BATCH_SIZE = 100;
const PAGINA_IMPORTACION = 1000;
const COLUMNAS_IMPORTACION =
  'id, nombre, codigo_barras, precio, en_oferta, precio_oferta, porcentaje_oferta, es_2x1';

function mapearProductoImportacion(row: Record<string, unknown>): ProductoParaImportacion {
  return {
    id:                row.id as string,
    nombre:            row.nombre as string,
    codigo_barras:     (row.codigo_barras as string | null) ?? null,
    precio:            Number(row.precio),
    en_oferta:         Boolean(row.en_oferta),
    precio_oferta:     row.precio_oferta != null ? Number(row.precio_oferta) : null,
    porcentaje_oferta: row.porcentaje_oferta != null ? Number(row.porcentaje_oferta) : null,
    es_2x1:            Boolean(row.es_2x1),
  };
}

// Todos los productos, para cotejarlos contra el CSV de precios. Supabase
// corta cada consulta en 1000 filas, así que se pagina con .range(); el
// orden por id mantiene estable la paginación entre páginas.
export async function listarParaImportacion(): Promise<ProductoParaImportacion[]> {
  const productos: ProductoParaImportacion[] = [];

  for (let desde = 0; ; desde += PAGINA_IMPORTACION) {
    const { data, error } = await supabase
      .from('products')
      .select(COLUMNAS_IMPORTACION)
      .order('id')
      .range(desde, desde + PAGINA_IMPORTACION - 1);

    if (error) throw error;

    const filas = data ?? [];
    productos.push(...filas.map(mapearProductoImportacion));
    if (filas.length < PAGINA_IMPORTACION) break;
  }

  return productos;
}

export async function encontrarPreciosPorIds(
  ids: string[]
): Promise<Map<string, ProductoParaImportacion>> {
  const mapa = new Map<string, ProductoParaImportacion>();

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const { data, error } = await supabase
      .from('products')
      .select(COLUMNAS_IMPORTACION)
      .in('id', ids.slice(i, i + BATCH_SIZE));

    if (error) throw error;

    for (const row of data ?? []) {
      const producto = mapearProductoImportacion(row);
      mapa.set(producto.id, producto);
    }
  }

  return mapa;
}

// precio y precio_oferta van en la misma sentencia: si se actualizaran por
// separado, un corte entre las dos dejaría la oferta más cara que el precio
// de lista.
export async function actualizarPrecioYOferta(
  id: string,
  cambios: { precio: number; precio_oferta?: number }
): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update(cambios)
    .eq('id', id);

  return !error;
}
