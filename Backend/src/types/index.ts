import type { ProvinciaCodigo } from '../config/provincias';
import type { EstadoPedido } from '../config/estadosPedido';
export type { ProvinciaCodigo };

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
  alicuota_iva: number;
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
  alicuota_iva?: number;
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
  alicuota_iva?: number;
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
  estado: EstadoPedido;
  total: number;
  subtotal_lista: number;
  nro_pedido: number;
  notas: string | null;
  metodo_envio: MetodoEnvio;
  costo_envio: number;
  sucursal_correo_argentino: string | null;
  codigo_postal_envio: string | null;
  metodo_pago: MetodoPago | null;
  pw_payment_id: string | null;
  fecha_pedido: string;
  fecha_cancelacion: string | null;
  motivo_cancelacion: string | null;
  creado_en: string;
  shipping_tracking_number: string | null;
  shipping_fecha_envio: string | null;
  shipping_creado_en_correo: string | null;
  shipping_error: string | null;
  destinatario_nombre: string | null;
  destinatario_dni: string | null;
  destinatario_cod_area: string | null;
  destinatario_telefono: string | null;
  detalles?: DetallePedido[];
}

export interface PedidoDetalleAdmin extends Pedido {
  cliente: {
    email: string | null;
    nombre: string | null;
    apellido: string | null;
    telefono: string | null;
    dni: string | null;
  };
  direccion_envio: Direccion | null;
  factura: Factura | null;
}

export interface Factura {
  id: string;
  pedido_id: string;
  estado: 'pendiente' | 'emitida' | 'error';
  tipo_comprobante: number | null;
  punto_venta: number | null;
  nro_comprobante: number | null;
  cae: string | null;
  cae_vencimiento: string | null;
  importe_total: number | null;
  respuesta_error: string | null;
  intentos: number;
  pdf_url: string | null;
  creado_en: string;
  actualizado_en: string;
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
  sucursal_correo_argentino?: string;
  codigo_postal_envio?: string;
  metodo_pago: MetodoPago;
  destinatario_nombre?: string;
  destinatario_dni?: string;
  destinatario_cod_area?: string;
  destinatario_telefono?: string;
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
  calle: string;
  altura: string;
  piso: string | null;
  depto: string | null;
  ciudad: string;
  provincia: string;
  provincia_codigo: ProvinciaCodigo | null;
  pais: string;
  codigo_postal: string | null;
  lat: number | null;
  lng: number | null;
  creado_en: string;
}

export interface GuardarDireccionDTO {
  calle: string;
  altura: string;
  piso?: string | null;
  depto?: string | null;
  ciudad: string;
  provincia: string;
  provincia_codigo: ProvinciaCodigo;
  pais?: string;
  codigo_postal?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface FilaPreviewPrecio {
  codigo_barras: string;
  nombre: string;
  precio_actual: number;
  precio_nuevo: number;
}

export interface FilaNoEncontrada {
  codigo_barras: string;
  nombre: string;
  precio_csv: number;
}

export interface PreviewImportarPreciosResponse {
  actualizaciones: FilaPreviewPrecio[];
  no_encontrados: FilaNoEncontrada[];
}

export interface ItemConfirmarPrecio {
  codigo_barras: string;
  precio_nuevo: number;
  nombre?: string;
}

export interface ResultadoConfirmarPrecios {
  actualizados: number;
  creados: number;
  fallidos: { codigo_barras: string; razon: string }[];
}

import type { User } from '@supabase/supabase-js';
import type { Request } from 'express';

export interface AuthRequest extends Request {
  user: User;
}

export interface FraudData {
  email:        string;
  nombre:       string;
  apellido:     string;
  telefono:     string;
  street1:      string;
  ciudad:       string;
  provincia:    string;
  codigoPostal: string;
  userId:       string;
}

export interface FiltrosProducto {
  categoria?: string;
  categorias?: string;
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
