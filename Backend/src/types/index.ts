export interface Categoria {
  id: string;
  nombre: string;
  id_padre: string | null;
  creado_en: string;
  hijos?: Categoria[];
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
  es_venta_libre: boolean;
  peso_gramos: number;
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
  es_venta_libre?: boolean;
  peso_gramos?: number;
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
  es_venta_libre?: boolean;
  peso_gramos?: number;
}

export interface DetallePedido {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  precio_lista: number;
  subtotal: number;
}

export type MetodoEnvio = 'retiro_farmacia' | 'domicilio' | 'retiro_sucursal';

export type MetodoPago = 'tarjeta' | 'transferencia' | 'efectivo';

export interface Pedido {
  id: string;
  user_id: string;
  estado: 'pendiente'|'confirmado'|'en_preparacion'|'enviado'|'entregado'|'cancelado'|'anulado';
  total: number;
  subtotal_lista: number;
  nro_pedido: number;
  notas: string | null;
  metodo_envio: MetodoEnvio;
  costo_envio: number;
  sucursal_andreani: string | null;
  codigo_postal_envio: string | null;
  metodo_pago: MetodoPago | null;
  pw_payment_id: string | null;
  fecha_pedido: string;
  fecha_cancelacion: string | null;
  creado_en: string;
  detalles?: DetallePedido[];
}

export interface CrearPedidoDTO {
  items: {
    producto_id: string;
    nombre_producto: string;
    cantidad: number;
    precio_unitario: number;
    precio_lista: number;
  }[];
  notas?: string;
  metodo_envio: MetodoEnvio;
  costo_envio: number;
  sucursal_andreani?: string;
  codigo_postal_envio?: string;
  metodo_pago: MetodoPago;
}

export interface CrearCategoriaDTO {
  nombre: string;
  id_padre?: string;
}

export interface ActualizarCategoriaDTO {
  nombre?: string;
  id_padre?: string | null;
}

export interface Perfil {
  user_id: string;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  genero: string | null;
  fecha_nacimiento: string | null;
  telefono: string | null;
  foto_url: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface ActualizarPerfilDTO {
  nombre?: string;
  apellido?: string;
  dni?: string;
  genero?: string;
  fecha_nacimiento?: string;
  telefono?: string;
  foto_url?: string;
}

export interface Direccion {
  id: string;
  user_id: string;
  calle_numero: string;
  ciudad: string;
  provincia: string;
  pais: string;
  codigo_postal: string | null;
  lat: number | null;
  lng: number | null;
  creado_en: string;
}

export interface GuardarDireccionDTO {
  calle_numero: string;
  ciudad: string;
  provincia: string;
  pais?: string;
  codigo_postal?: string | null;
  lat?: number | null;
  lng?: number | null;
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
  adminMode?: boolean;
}
