import { supabase } from '../config/supabase';
import { recopilarDescendientes } from '../utils/categoriaTree';
import type {
  Producto,
  CrearProductoDTO,
  ActualizarProductoDTO,
  FiltrosProducto,
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
    const { data: cats } = await supabase
      .from('categories')
      .select('id')
      .ilike('nombre', `%${filtros.busqueda}%`);

    const catIds = (cats ?? []).map((c: { id: string }) => c.id);

    if (catIds.length > 0) {
      query = query.or(`nombre.ilike.%${filtros.busqueda}%,categoria_id.in.(${catIds.join(',')})`);
    } else {
      query = query.ilike('nombre', `%${filtros.busqueda}%`);
    }
  }

  if (filtros.codigo_barras) {
    query = query.ilike('codigo_barras', `%${filtros.codigo_barras}%`);
  }

  if (filtros.en_oferta !== undefined) {
    query = query.eq('en_oferta', filtros.en_oferta);
  }

  if (filtros.precio_min !== undefined) query = query.gte('precio', filtros.precio_min);
  if (filtros.precio_max !== undefined) query = query.lte('precio', filtros.precio_max);
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

  return {
    datos: (data ?? []).map(mapearProducto),
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
  return mapearProducto(data);
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

export async function encontrarPorCodigosBarras(
  codigos: string[]
): Promise<Map<string, { id: string; nombre: string; precio: number }>> {
  if (codigos.length === 0) return new Map();

  const mapa = new Map<string, { id: string; nombre: string; precio: number }>();

  for (let i = 0; i < codigos.length; i += BATCH_SIZE) {
    const lote = codigos.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('products')
      .select('id, nombre, precio, codigo_barras')
      .in('codigo_barras', lote);

    if (error) throw error;

    for (const row of data ?? []) {
      if (row.codigo_barras) {
        mapa.set(row.codigo_barras, {
          id:     row.id,
          nombre: row.nombre,
          precio: Number(row.precio),
        });
      }
    }
  }

  return mapa;
}

export async function actualizarPrecioPorId(
  id: string,
  precio: number
): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ precio })
    .eq('id', id);

  return !error;
}
