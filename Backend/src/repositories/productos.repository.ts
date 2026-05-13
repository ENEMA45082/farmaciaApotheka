import { supabase } from '../config/supabase';
import type {
  Producto,
  CrearProductoDTO,
  ActualizarProductoDTO,
  FiltrosProducto,
} from '../types';

// Mapea las columnas de la DB (inglés) al tipo Producto (español)
function mapearProducto(row: Record<string, unknown>): Producto {
  return {
    id:                row.id as string,
    nombre:            row.name as string,
    descripcion:       row.description as string | null,
    precio:            Number(row.price),
    en_oferta:         Boolean(row.en_oferta),
    precio_oferta:     row.precio_oferta != null ? Number(row.precio_oferta) : null,
    porcentaje_oferta: row.porcentaje_oferta != null ? Number(row.porcentaje_oferta) : null,
    imagen_url:        row.image_url as string | null,
    categoria_id:      row.category_id as string | null,
    stock:             Number(row.stock),
    codigo_barras:     row.barcode as string | null,
    fecha_vencimiento: row.expiration_date as string | null,
    imagenes:          (row.images as string[]) ?? [],
    creado_en:         row.created_at as string,
    categoria: row.category
      ? {
          id:        (row.category as Record<string, unknown>).id as string,
          nombre:    (row.category as Record<string, unknown>).name as string,
          slug:      (row.category as Record<string, unknown>).slug as string,
          icono:     (row.category as Record<string, unknown>).icon_name as string | null,
          creado_en: (row.category as Record<string, unknown>).created_at as string,
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
    .select('*, category:categories(*)', { count: 'exact' });

  if (filtros.categoria) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filtros.categoria)
      .single();

    if (!cat) return { datos: [], total: 0 };
    query = query.eq('category_id', cat.id);
  }

  if (filtros.busqueda) {
    query = query.ilike('name', `%${filtros.busqueda}%`);
  }

  if (filtros.codigo_barras) {
    query = query.ilike('barcode', `%${filtros.codigo_barras}%`);
  }

  if (filtros.en_oferta !== undefined) {
    query = query.eq('en_oferta', filtros.en_oferta);
  }

  if (filtros.precio_min !== undefined) query = query.gte('price', filtros.precio_min);
  if (filtros.precio_max !== undefined) query = query.lte('price', filtros.precio_max);
  if (filtros.stock_min  !== undefined) query = query.gte('stock', filtros.stock_min);
  if (filtros.stock_max  !== undefined) query = query.lte('stock', filtros.stock_max);

  if (filtros.vencimiento_desde) query = query.gte('expiration_date', filtros.vencimiento_desde);
  if (filtros.vencimiento_hasta) query = query.lte('expiration_date', filtros.vencimiento_hasta);

  const ordenMap: Record<string, { column: string; ascending: boolean }> = {
    nombre_asc:  { column: 'name',  ascending: true  },
    nombre_desc: { column: 'name',  ascending: false },
    precio_asc:  { column: 'price', ascending: true  },
    precio_desc: { column: 'price', ascending: false },
  };
  const ord = filtros.ordenar ? ordenMap[filtros.ordenar] : null;
  query = ord
    ? query.order(ord.column, { ascending: ord.ascending })
    : query.order('created_at', { ascending: false });

  const { data, error, count } = await query.range(desde, hasta);

  if (error) throw error;

  return {
    datos: (data ?? []).map(mapearProducto),
    total: count ?? 0,
  };
}

export async function encontrarPorId(id: string): Promise<Producto | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapearProducto(data);
}

export async function crear(dto: CrearProductoDTO): Promise<Producto> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name:              dto.nombre,
      description:       dto.descripcion ?? null,
      price:             dto.precio,
      en_oferta:         dto.en_oferta        ?? false,
      precio_oferta:     dto.precio_oferta    ?? null,
      porcentaje_oferta: dto.porcentaje_oferta ?? null,
      image_url:         dto.imagen_url ?? null,
      category_id:       dto.categoria_id ?? null,
      stock:             dto.stock ?? 0,
      barcode:           dto.codigo_barras ?? null,
      expiration_date:   dto.fecha_vencimiento ?? null,
      images:            dto.imagenes ?? [],
    })
    .select('*, category:categories(*)')
    .single();

  if (error || !data) throw error ?? new Error('Error al crear el producto');
  return mapearProducto(data);
}

export async function actualizar(id: string, dto: ActualizarProductoDTO): Promise<Producto | null> {
  const cambios: Record<string, unknown> = {};
  if (dto.nombre             !== undefined) cambios.name              = dto.nombre;
  if (dto.descripcion        !== undefined) cambios.description       = dto.descripcion;
  if (dto.precio             !== undefined) cambios.price             = dto.precio;
  if (dto.en_oferta          !== undefined) cambios.en_oferta         = dto.en_oferta;
  if (dto.precio_oferta      !== undefined) cambios.precio_oferta     = dto.precio_oferta;
  if (dto.porcentaje_oferta  !== undefined) cambios.porcentaje_oferta = dto.porcentaje_oferta;
  if (dto.imagen_url         !== undefined) cambios.image_url         = dto.imagen_url;
  if (dto.categoria_id     !== undefined) cambios.category_id     = dto.categoria_id;
  if (dto.stock            !== undefined) cambios.stock           = dto.stock;
  if (dto.codigo_barras    !== undefined) cambios.barcode         = dto.codigo_barras;
  if (dto.fecha_vencimiento !== undefined) cambios.expiration_date = dto.fecha_vencimiento;
  if (dto.imagenes          !== undefined) cambios.images          = dto.imagenes;

  const { data, error } = await supabase
    .from('products')
    .update(cambios)
    .eq('id', id)
    .select('*, category:categories(*)')
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
