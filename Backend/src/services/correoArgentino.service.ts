// Servicio de integración con la API MiCorreo de Correo Argentino.
// Modo stub: devuelve datos simulados cuando no hay credenciales configuradas
// (CORREO_AR_USUARIO vacío). Para activar el modo real, cargar en .env:
//   CORREO_AR_USUARIO, CORREO_AR_PASSWORD, CORREO_AR_BASE_URL, CORREO_AR_CUSTOMER_ID,
//   CORREO_AR_POSTAL_CODE_ORIGIN, CORREO_AR_SENDER_*
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AppError } from '../errors/AppError';
import { CAJA_ESTANDAR_CM } from '../config/envioConfig';
import type { ProvinciaCodigo } from '../config/provincias';

export interface SucursalCorreoArgentino {
  code: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  provinciaCodigo: ProvinciaCodigo;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
}

export interface ResultadoCotizacion {
  precio: number;
  diasEstimados: string;
}

export interface DatosEnvioReal {
  extOrderId: string;   // pedido.id
  orderNumber: string;  // pedido.nro_pedido como string
  recipient: { name: string; phone?: string; cellPhone?: string; email: string };
  deliveryType: 'D' | 'S';
  agency?: string; // requerido si deliveryType === 'S'
  address?: {      // requerido si deliveryType !== 'S'
    streetName: string;
    streetNumber: string;
    floor?: string;
    apartment?: string;
    city: string;
    provinceCode: ProvinciaCodigo;
    postalCode: string;
  };
  weightGramos: number;
  declaredValue: number;
}

export interface ResultadoEnvioReal {
  ok: boolean;
  createdAt?: string;
  errorCode?: string;
  errorMessage?: string;
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

const MODO_STUB = !process.env.CORREO_AR_USUARIO;

// ---------------------------------------------------------------------------
// Manejo de token (solo modo real)
// ---------------------------------------------------------------------------

let tokenCache: { token: string; expiresAtMs: number } | null = null;

function resolverExpiracionMs(expires: unknown): number {
  // La doc de MiCorreo muestra "expires" como fecha absoluta ("2022-04-26 21:16:20").
  // Se soporta también el caso de que llegue como cantidad de segundos (defensivo).
  if (typeof expires === 'number') return expires * 1000 - Date.now();
  const fecha = new Date(String(expires).replace(' ', 'T'));
  if (!Number.isNaN(fecha.getTime())) return fecha.getTime() - Date.now();
  return 10 * 60 * 1000; // fallback conservador: 10 minutos
}

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAtMs - 5000) return tokenCache.token;

  const baseURL  = process.env.CORREO_AR_BASE_URL ?? '';
  const usuario  = process.env.CORREO_AR_USUARIO ?? '';
  const password = process.env.CORREO_AR_PASSWORD ?? '';

  const { data } = await axios.post<{ token: string; expires: string }>(
    `${baseURL}/token`,
    null,
    { auth: { username: usuario, password } },
  );

  tokenCache = { token: data.token, expiresAtMs: Date.now() + resolverExpiracionMs(data.expires) };
  return tokenCache.token;
}

function crearCliente(): AxiosInstance {
  const instance = axios.create({ baseURL: process.env.CORREO_AR_BASE_URL });

  instance.interceptors.request.use(async config => {
    const token = await getToken();
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    res => res,
    async error => {
      const config = error.config as (AxiosRequestConfig & { _reintentado?: boolean }) | undefined;
      if (error.response?.status === 401 && config && !config._reintentado) {
        tokenCache = null;
        config._reintentado = true;
        return instance.request(config);
      }
      throw error;
    },
  );

  return instance;
}

let cliente: AxiosInstance | null = null;
function getCliente(): AxiosInstance {
  if (!cliente) cliente = crearCliente();
  return cliente;
}

// ---------------------------------------------------------------------------
// Cotización
// ---------------------------------------------------------------------------

export async function cotizar(params: {
  postalCodeOrigin: string;
  postalCodeDestination: string;
  deliveredType: 'D' | 'S';
  pesoGramos: number;
}): Promise<ResultadoCotizacion> {
  if (MODO_STUB) {
    return params.deliveredType === 'D'
      ? { precio: 3500, diasEstimados: '3 a 5 días hábiles' }
      : { precio: 2500, diasEstimados: '2 a 4 días hábiles' };
  }

  const { data } = await getCliente().post<{
    rates: { deliveredType: string; price: number; deliveryTimeMin: string; deliveryTimeMax: string }[];
  }>('/rates', {
    customerId: process.env.CORREO_AR_CUSTOMER_ID,
    postalCodeOrigin: params.postalCodeOrigin,
    postalCodeDestination: params.postalCodeDestination,
    deliveredType: params.deliveredType,
    dimensions: {
      weight: Math.round(params.pesoGramos),
      height: CAJA_ESTANDAR_CM.height,
      width:  CAJA_ESTANDAR_CM.width,
      length: CAJA_ESTANDAR_CM.length,
    },
  });

  const rate = data.rates?.find(r => r.deliveredType === params.deliveredType) ?? data.rates?.[0];
  if (!rate) throw new AppError('No se pudo cotizar el envío para este destino', 502, 'COTIZACION_ENVIO_FALLIDA');

  return {
    precio: rate.price,
    diasEstimados: `${rate.deliveryTimeMin} a ${rate.deliveryTimeMax} días hábiles`,
  };
}

// ---------------------------------------------------------------------------
// Sucursales
// ---------------------------------------------------------------------------

export async function listarSucursalesPorProvincia(
  provinciaCodigo: ProvinciaCodigo,
): Promise<SucursalCorreoArgentino[]> {
  if (MODO_STUB) {
    return [
      { code: 'STUB-001', nombre: 'Sucursal Centro', direccion: 'Av. Corrientes 1234', ciudad: 'CABA', provinciaCodigo, postalCode: '1000', lat: null, lng: null },
      { code: 'STUB-002', nombre: 'Sucursal Norte',  direccion: 'Av. Cabildo 4567',    ciudad: 'CABA', provinciaCodigo, postalCode: '1000', lat: null, lng: null },
      { code: 'STUB-003', nombre: 'Sucursal Oeste',  direccion: 'Av. Rivadavia 9999',  ciudad: 'CABA', provinciaCodigo, postalCode: '1000', lat: null, lng: null },
    ];
  }

  interface AgenciaRespuesta {
    code: string;
    name: string;
    location: {
      address: { streetName: string; streetNumber: string; city: string; provinceCode: string; postalCode: string };
      latitude: string;
      longitude: string;
    };
  }

  const { data } = await getCliente().get<AgenciaRespuesta[]>('/agencies', {
    params: { customerId: process.env.CORREO_AR_CUSTOMER_ID, provinceCode: provinciaCodigo },
  });

  return (data ?? []).map(a => ({
    code: a.code,
    nombre: a.name,
    direccion: `${a.location.address.streetName} ${a.location.address.streetNumber}`,
    ciudad: a.location.address.city,
    provinciaCodigo,
    postalCode: a.location.address.postalCode ?? null,
    lat: a.location.latitude ? Number(a.location.latitude) : null,
    lng: a.location.longitude ? Number(a.location.longitude) : null,
  }));
}

// ---------------------------------------------------------------------------
// Creación de envío real
// ---------------------------------------------------------------------------

export async function crearEnvio(datos: DatosEnvioReal): Promise<ResultadoEnvioReal> {
  if (MODO_STUB) {
    return { ok: true, createdAt: new Date().toISOString() };
  }

  const sender = {
    name:      process.env.CORREO_AR_SENDER_NAME ?? '',
    phone:     process.env.CORREO_AR_SENDER_PHONE ?? '',
    cellPhone: process.env.CORREO_AR_SENDER_CELLPHONE ?? '',
    email:     process.env.CORREO_AR_SENDER_EMAIL ?? '',
    originAddress: {
      streetName:   process.env.CORREO_AR_SENDER_STREET_NAME ?? '',
      streetNumber: process.env.CORREO_AR_SENDER_STREET_NUMBER ?? '',
      floor:        process.env.CORREO_AR_SENDER_FLOOR ?? '',
      apartment:    process.env.CORREO_AR_SENDER_APARTMENT ?? '',
      city:         process.env.CORREO_AR_SENDER_CITY ?? '',
      provinceCode: process.env.CORREO_AR_SENDER_PROVINCE_CODE ?? '',
      postalCode:   process.env.CORREO_AR_SENDER_POSTAL_CODE ?? '',
    },
  };

  try {
    const { data } = await getCliente().post<{ createdAt: string }>('/shipping/import', {
      customerId: process.env.CORREO_AR_CUSTOMER_ID,
      extOrderId: datos.extOrderId,
      orderNumber: datos.orderNumber,
      sender,
      recipient: datos.recipient,
      shipping: {
        deliveryType: datos.deliveryType,
        productType: 'CP',
        agency: datos.deliveryType === 'S' ? datos.agency : undefined,
        address: datos.deliveryType !== 'S' ? datos.address : undefined,
        weight: Math.round(datos.weightGramos),
        declaredValue: datos.declaredValue,
        height: CAJA_ESTANDAR_CM.height,
        length: CAJA_ESTANDAR_CM.length,
        width:  CAJA_ESTANDAR_CM.width,
      },
    });
    return { ok: true, createdAt: data.createdAt };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data) {
      const body = err.response.data as { code?: string; message?: string };
      return { ok: false, errorCode: body.code, errorMessage: body.message ?? 'Error desconocido de Correo Argentino' };
    }
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Error desconocido de Correo Argentino' };
  }
}

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

// RIESGO A VALIDAR CON SOPORTE DE CORREO ARGENTINO:
// /shipping/import no devuelve un shippingId explícito, solo {createdAt}.
// El tracking se hace con /shipping/tracking usando un "shippingId" cuyo origen
// exacto no está 100% claro en la doc. Hasta tener credenciales reales, se
// persiste el propio extOrderId (= pedido.id) como shippingId candidato y se
// prueba contra el ambiente de test. Si no funciona, ajustar acá sin tocar el
// resto del código (pedidos.service.ts solo conoce "shipping_tracking_number").
export async function obtenerTracking(trackingNumber: string): Promise<ResultadoTracking> {
  if (MODO_STUB) {
    return {
      encontrado: true,
      trackingNumber,
      events: [
        { event: 'PREIMPOSICION', date: new Date().toLocaleString('es-AR'), branch: 'CORREO ARGENTINO (simulado)', status: '', sign: null },
      ],
    };
  }

  interface TrackingRespuesta {
    id: string | null;
    productId: string | null;
    trackingNumber: string;
    events: EventoTracking[];
  }
  interface TrackingError { date: string; error: string; code: string }

  const { data } = await getCliente().request<TrackingRespuesta[] | TrackingRespuesta | TrackingError>({
    method: 'get',
    url: '/shipping/tracking',
    data: { shippingId: trackingNumber },
  });

  if (Array.isArray(data)) {
    const primero = data[0];
    if (!primero) return { encontrado: false, trackingNumber, events: [] };
    return { encontrado: true, trackingNumber: primero.trackingNumber, events: primero.events };
  }
  if ('error' in data) return { encontrado: false, trackingNumber, events: [] };
  return { encontrado: data.id !== null, trackingNumber: data.trackingNumber, events: data.events ?? [] };
}
