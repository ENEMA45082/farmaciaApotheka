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

export interface ProductosPaginados {
  datos: Producto[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface CrearProductoDTO {
  nombre: string;
  descripcion?: string;
  precio: number;
  en_oferta?: boolean;
  precio_oferta?: number | null;
  porcentaje_oferta?: number | null;
  imagen_url?: string;
  categoria_id?: string;
  stock?: number;
  codigo_barras?: string;
  fecha_vencimiento?: string;
  imagenes?: string[];
}

export interface ActualizarProductoDTO {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  en_oferta?: boolean;
  precio_oferta?: number | null;
  porcentaje_oferta?: number | null;
  imagen_url?: string;
  categoria_id?: string;
  stock?: number;
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

export interface FiltrosProducto {
  categoria?: string;
  busqueda?: string;
  codigo_barras?: string;
  en_oferta?: boolean;
  precio_min?: number;
  precio_max?: number;
  stock_min?: number;
  stock_max?: number;
  vencimiento_desde?: string;
  vencimiento_hasta?: string;
  pagina?: number;
  limite?: number;
  ordenar?: 'nombre_asc' | 'nombre_desc' | 'precio_asc' | 'precio_desc';
}
