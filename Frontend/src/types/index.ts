export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  icono: string | null;
  creado_en: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  en_oferta: boolean;
  precio_oferta: number | null;
  porcentaje_oferta: number | null;
  imagen_url: string | null;
  categoria_id: string | null;
  stock: number;
  codigo_barras: string | null;
  fecha_vencimiento: string | null;
  imagenes: string[];
  creado_en: string;
  categoria?: Categoria;
}

export function precioEfectivo(p: Producto): number {
  return p.en_oferta && p.precio_oferta != null ? p.precio_oferta : p.precio;
}

export interface ProductosPaginados {
  datos: Producto[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

export interface EstadoCarrito {
  items: ItemCarrito[];
  totalItems: number;
  totalPrecio: number;
  subtotalLista: number;
}

export interface CrearProductoDTO {
  nombre: string;
  precio: number;
  en_oferta?: boolean;
  precio_oferta?: number | null;
  porcentaje_oferta?: number | null;
  descripcion?: string;
  stock?: number;
  categoria_id?: string;
  imagen_url?: string;
  codigo_barras?: string;
  fecha_vencimiento?: string;
  imagenes?: string[];
}

export interface ActualizarProductoDTO {
  nombre?: string;
  precio?: number;
  en_oferta?: boolean;
  precio_oferta?: number | null;
  porcentaje_oferta?: number | null;
  descripcion?: string;
  stock?: number;
  categoria_id?: string;
  imagen_url?: string;
  codigo_barras?: string;
  fecha_vencimiento?: string;
  imagenes?: string[];
}

export interface CrearCategoriaDTO {
  nombre: string;
  icono?: string;
}

export interface ActualizarCategoriaDTO {
  nombre?: string;
  icono?: string;
}
