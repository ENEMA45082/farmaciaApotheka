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

export interface CategoriasPaginadas {
  datos: Categoria[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface FiltrosCategoria {
  busqueda?: string;
  pagina?: number;
  limite?: number;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  en_oferta: boolean;
  precio_oferta: number | null;
  porcentaje_oferta: number | null;
  es_2x1: boolean;
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
  es_2x1?: boolean;
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
  es_2x1?: boolean;
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
  descuento: number;
  subtotal: number;
}

export type MetodoEnvio = 'retiro_farmacia' | 'domicilio' | 'retiro_sucursal';

export type TipoServicioEnvio = 'PAQ_AR_HOY' | 'PAQ_AR_EXPRESO' | 'PAQ_AR_CLASICO';

export type MetodoPago = 'tarjeta' | 'transferencia' | 'efectivo';

export type TipoDocumento = 'DNI' | 'CUIT';

export interface Estado {
  id: number;
  nombre: EstadoPedido;
  descripcion: string | null;
  es_final: boolean;
  orden: number;
  creado_en: string;
}

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
  tipo_servicio_envio: TipoServicioEnvio | null;
  sucursal_correo_argentino: string | null;
  codigo_postal_envio: string | null;
  metodo_pago: MetodoPago | null;
  pw_payment_id: string | null;
  // Referencia "humana" que Payway muestra en su portal (ej. "CH210720261701") —
  // distinta del pw_payment_id (id numérico interno de la API). Se guarda para
  // poder comparar un pedido contra el panel de Payway.
  pw_site_transaction_id: string | null;
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
  cupon_id: string | null;
  cupon_codigo: string | null;
  descuento_cupon: number;
  puntos_ganados: number;
  detalles?: DetallePedido[];
}

export interface PedidoDetalleAdmin extends Pedido {
  cliente: {
    email: string | null;
    nombre: string | null;
    apellido: string | null;
    telefono: string | null;
    dni: string | null;
    documento_tipo: TipoDocumento | null;
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
  receptor_doc_tipo: number | null;
  receptor_doc_nro: number | null;
  creado_en: string;
  actualizado_en: string;
}

// Item de pedido con precio ya confirmado contra el catálogo (products.precio /
// precio_oferta) — nunca se construye a partir de valores enviados por el cliente.
// Ver pedidos.service.ts::crear.
export interface ItemPedidoConfirmado {
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  precio_lista: number;
  descuento: number;
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
  tipo_servicio_envio?: TipoServicioEnvio;
  sucursal_correo_argentino?: string;
  codigo_postal_envio?: string;
  metodo_pago: MetodoPago;
  destinatario_nombre?: string;
  destinatario_dni?: string;
  destinatario_cod_area?: string;
  destinatario_telefono?: string;
  codigo_cupon?: string;
}

export type TipoCupon = 'porcentaje' | 'fijo';

export interface Cupon {
  id: string;
  codigo: string;
  tipo: TipoCupon;
  valor: number;
  compra_minima: number;
  descuento_maximo: number | null;
  limite_usos_total: number | null;
  limite_usos_por_cliente: number | null;
  valido_desde: string | null;
  valido_hasta: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

// Cupón + conteo de canjes totales, para el listado de admin.
export interface CuponConUsos extends Cupon {
  usos: number;
}

export interface CrearCuponDTO {
  codigo: string;
  tipo: TipoCupon;
  valor: number;
  compra_minima?: number;
  descuento_maximo?: number | null;
  limite_usos_total?: number | null;
  limite_usos_por_cliente?: number | null;
  valido_desde?: string | null;
  valido_hasta?: string | null;
  activo?: boolean;
}

export interface ActualizarCuponDTO {
  tipo?: TipoCupon;
  valor?: number;
  compra_minima?: number;
  descuento_maximo?: number | null;
  limite_usos_total?: number | null;
  limite_usos_por_cliente?: number | null;
  valido_desde?: string | null;
  valido_hasta?: string | null;
  activo?: boolean;
}

// Item mínimo confiable del carrito: el precio SIEMPRE se re-resuelve contra
// el catálogo (ver resolverItemsCarrito en productos.service.ts), nunca se
// toma del que manda el cliente.
export interface ItemCarritoInput {
  producto_id: string;
  cantidad: number;
}

export type MotivoCuponInvalido =
  | 'CODIGO_INEXISTENTE'
  | 'INACTIVO'
  | 'VENCIDO'
  | 'AUN_NO_VIGENTE'
  | 'LIMITE_USOS_ALCANZADO'
  | 'LIMITE_CLIENTE_ALCANZADO'
  | 'COMPRA_MINIMA_NO_ALCANZADA';

export interface ResultadoValidacionCupon {
  valido: boolean;
  descuento: number;
  montoElegible: number;
  motivo?: MotivoCuponInvalido;
  mensaje?: string;
  // Solo cuando valido === true — lo usa pedidos.service.ts para no volver a
  // buscar el cupón por código al pasarle el id a la RPC.
  cuponId?: string;
}

export interface Premio {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  costo_puntos: number;
  stock: number | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface CrearPremioDTO {
  nombre: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  costo_puntos: number;
  stock?: number | null;
  activo?: boolean;
}

export interface ActualizarPremioDTO {
  nombre?: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  costo_puntos?: number;
  stock?: number | null;
  activo?: boolean;
}

export type TipoMovimientoPuntos = 'acreditacion' | 'canje' | 'ajuste';

export interface MovimientoPuntos {
  id: string;
  cliente_id: string;
  tipo: TipoMovimientoPuntos;
  puntos: number;
  pedido_id: string | null;
  canje_id: string | null;
  motivo: string | null;
  creado_en: string;
}

// Resultado de buscar clientes por DNI para cargarles puntos a mano
// (compra física en el local). No hay unicidad de DNI a nivel DB, por
// eso la búsqueda devuelve una lista (normalmente de 0 o 1 elemento).
export interface ClienteBusquedaDNI {
  user_id: string;
  email: string | null;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  puntos_saldo: number;
}

export interface AcreditarPuntosManualDTO {
  cliente_id: string;
  puntos: number;
  motivo?: string | null;
}

export interface CanjePremio {
  id: string;
  cliente_id: string;
  premio_id: string;
  puntos_gastados: number;
  canjeado_en: string;
}

// Canje + nombre del premio, para que el admin vea qué despachar sin un join aparte.
export interface CanjePremioConDetalle extends CanjePremio {
  premio_nombre: string;
}

export interface SaldoPuntos {
  saldo: number;
  movimientos: MovimientoPuntos[];
}

export interface CrearCategoriaDTO {
  nombre: string;
  id_padre?: string;
}

export interface ActualizarCategoriaDTO {
  nombre?: string;
  id_padre?: string | null;
}

export interface Banner {
  id: string;
  imagen_url: string;
  link_url: string | null;
  alt_texto: string;
  orden: number;
  activo: boolean;
  creado_en: string;
}

export interface CrearBannerDTO {
  imagen_url: string;
  link_url?: string | null;
  alt_texto: string;
  orden?: number;
}

export interface ActualizarBannerDTO {
  imagen_url?: string;
  link_url?: string | null;
  alt_texto?: string;
  orden?: number;
  activo?: boolean;
}

export type TemaBannerPromo = 'turquesa' | 'azul' | 'coral' | 'violeta' | 'verde';

export interface BannerPromo {
  id: string;
  imagen_url: string;
  titulo: string;
  vigencia_texto: string | null;
  badge_texto: string | null;
  tema: TemaBannerPromo;
  link_url: string | null;
  orden: number;
  activo: boolean;
  creado_en: string;
}

export interface CrearBannerPromoDTO {
  imagen_url: string;
  titulo: string;
  vigencia_texto?: string | null;
  badge_texto?: string | null;
  tema?: TemaBannerPromo;
  link_url?: string | null;
  orden?: number;
}

export interface ActualizarBannerPromoDTO {
  imagen_url?: string;
  titulo?: string;
  vigencia_texto?: string | null;
  badge_texto?: string | null;
  tema?: TemaBannerPromo;
  link_url?: string | null;
  orden?: number;
  activo?: boolean;
}

export interface ProductoDestacado {
  id: string;
  producto_id: string;
  orden: number;
  creado_en: string;
  producto?: Producto;
}

export interface CrearProductoDestacadoDTO {
  producto_id: string;
}

export interface ActualizarProductoDestacadoDTO {
  orden?: number;
}

export interface Perfil {
  user_id: string;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  documento_tipo: TipoDocumento;
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
  documento_tipo?: TipoDocumento;
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
