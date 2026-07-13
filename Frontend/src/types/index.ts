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

export function precioEfectivo(p: Producto): number {
  return p.en_oferta && p.precio_oferta != null ? p.precio_oferta : p.precio;
}

export function formatPrecio(n: number): string {
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
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
  es_venta_libre?: boolean;
  peso_gramos?: number;
  alicuota_iva?: number;
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
  es_venta_libre?: boolean;
  peso_gramos?: number;
  alicuota_iva?: number;
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
export type MetodoPago  = 'tarjeta' | 'transferencia' | 'efectivo';

export type ProvinciaCodigo =
  | 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'J'|'K'|'L'|'M'|'N'|'P'|'Q'|'R'|'S'|'T'|'U'|'V'|'W'|'X'|'Y'|'Z';

export const PROVINCIAS: { codigo: ProvinciaCodigo; nombre: string }[] = [
  { codigo: 'A', nombre: 'Salta' },
  { codigo: 'B', nombre: 'Buenos Aires' },
  { codigo: 'C', nombre: 'CABA' },
  { codigo: 'D', nombre: 'San Luis' },
  { codigo: 'E', nombre: 'Entre Ríos' },
  { codigo: 'F', nombre: 'La Rioja' },
  { codigo: 'G', nombre: 'Santiago del Estero' },
  { codigo: 'H', nombre: 'Chaco' },
  { codigo: 'J', nombre: 'San Juan' },
  { codigo: 'K', nombre: 'Catamarca' },
  { codigo: 'L', nombre: 'La Pampa' },
  { codigo: 'M', nombre: 'Mendoza' },
  { codigo: 'N', nombre: 'Misiones' },
  { codigo: 'P', nombre: 'Formosa' },
  { codigo: 'Q', nombre: 'Neuquén' },
  { codigo: 'R', nombre: 'Río Negro' },
  { codigo: 'S', nombre: 'Santa Fe' },
  { codigo: 'T', nombre: 'Tucumán' },
  { codigo: 'U', nombre: 'Chubut' },
  { codigo: 'V', nombre: 'Tierra del Fuego' },
  { codigo: 'W', nombre: 'Corrientes' },
  { codigo: 'X', nombre: 'Córdoba' },
  { codigo: 'Y', nombre: 'Jujuy' },
  { codigo: 'Z', nombre: 'Santa Cruz' },
];

export interface SucursalCorreoArgentino {
  code: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  provinciaCodigo: ProvinciaCodigo;
  postalCode: string | null;
}

export interface CotizacionEnvio {
  precio: number;
  diasEstimados: string;
}

export interface EventoTracking {
  event: string;
  date: string;
  branch: string;
  status: string;
  sign: string | null;
}

export interface ResultadoTracking {
  encontrado: boolean;
  trackingNumber: string | null;
  events: EventoTracking[];
}

export interface Pedido {
  id: string;
  user_id: string;
  estado: 'PendienteDePago'|'Confirmado'|'EnPreparacion'|'Enviado'|'ListoParaRetirar'|'Entregado'|'Cancelado';
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

export interface FacturaConProblema extends Factura {
  problema: 'error' | 'sin_pdf';
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
