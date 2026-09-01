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

export function precioEfectivo(p: Producto): number {
  return p.en_oferta && p.precio_oferta != null ? p.precio_oferta : p.precio;
}

// Promo 2x1: por cada par de unidades, 1 sale gratis (la unidad suelta de una
// cantidad impar se cobra completa). Mutuamente excluyente con precio_oferta
// — ver AdminProductosPage.tsx — así que precioEfectivo() ya devuelve el
// precio de lista para un producto 2x1, sin necesidad de tocar esa función.
export function descuento2x1(p: Producto, cantidad: number): number {
  if (!p.es_2x1) return 0;
  return Math.floor(cantidad / 2) * p.precio;
}

export function subtotalLinea(p: Producto, cantidad: number): number {
  return precioEfectivo(p) * cantidad - descuento2x1(p, cantidad);
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

export interface CategoriasPaginadas {
  datos: Categoria[];
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
  es_2x1?: boolean;
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
  es_2x1?: boolean;
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

export type TipoDocumento = 'DNI' | 'CUIT';

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

export type TipoServicioEnvio = 'PAQ_AR_HOY' | 'PAQ_AR_EXPRESO' | 'PAQ_AR_CLASICO';

export interface OpcionCotizacionEnvio {
  tipoServicio: TipoServicioEnvio;
  nombre: string;
  precio: number;
  plazoEstimado: string;
}

export interface CotizacionEnvio {
  opciones: OpcionCotizacionEnvio[];
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
  tipo_servicio_envio: TipoServicioEnvio | null;
  sucursal_correo_argentino: string | null;
  codigo_postal_envio: string | null;
  metodo_pago: MetodoPago | null;
  pw_payment_id: string | null;
  // Referencia "humana" que Payway muestra en su portal (ej. "CH210720261701") —
  // distinta del pw_payment_id (id numérico interno de la API).
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
  cuotas: number;
  recargo_financiero: number;
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
  receptor_doc_tipo: number | null;
  receptor_doc_nro: number | null;
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
  tipo_servicio_envio?: TipoServicioEnvio;
  sucursal_correo_argentino?: string;
  codigo_postal_envio?: string;
  metodo_pago: MetodoPago;
  destinatario_nombre?: string;
  destinatario_dni?: string;
  destinatario_cod_area?: string;
  destinatario_telefono?: string;
  codigo_cupon?: string;
  cuotas?: number;
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

export interface ClienteBusquedaDNI {
  user_id: string;
  email: string | null;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  puntos_saldo: number;
  es_cliente_fisico: boolean;
}

export interface CrearClienteFisicoDTO {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email?: string | null;
}

export interface CanjePremio {
  id: string;
  cliente_id: string;
  premio_id: string;
  puntos_gastados: number;
  canjeado_en: string;
}

export interface CanjePremioConDetalle extends CanjePremio {
  premio_nombre: string;
}

export interface SaldoPuntos {
  saldo: number;
  movimientos: MovimientoPuntos[];
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
  producto: Producto;
}

export interface CrearProductoDestacadoDTO {
  producto_id: string;
}

export interface ActualizarProductoDestacadoDTO {
  orden: number;
}
