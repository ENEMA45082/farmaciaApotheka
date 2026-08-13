// Servicio de cotización de envío a domicilio vía scraping del portal web
// de MiCorreo (Correo Argentino) — reemplaza a andreaniQuote.service.ts.
//
// Se cotiza automatizando el flujo real de "Nuevo envío" del portal
// (login → tab Individual → medidas → Destino: Entrega en Domicilio + CP)
// en vez de usar Andreani, porque Correo Argentino es el transportista real
// con el que se envía (ver correoArgentino.service.ts para creación de
// envíos/tracking/sucursales, todavía en modo stub porque el acceso a la
// API oficial de cotización nunca llegó — esta es la alternativa vía el
// portal web, con el que sí hay una cuenta de empresa operativa).
//
// Modo stub: si MICORREO_WEB_USUARIO está vacío, devuelve 3 tarifas
// simuladas sin lanzar ningún browser (mismo patrón que el resto de las
// integraciones externas de este proyecto).
import { MiCorreoQuoteError } from '../errors/MiCorreoQuoteError';
import * as scraper from './micorreoScraper';
import type { ProvinciaCodigo } from '../config/provincias';

export type TipoServicioMiCorreo = 'PAQ_AR_HOY' | 'PAQ_AR_EXPRESO' | 'PAQ_AR_CLASICO';

export interface ParametrosCotizacionMiCorreo {
  cpDestino: string;
  provinciaCodigo: ProvinciaCodigo;
  pesoKg: number;
  altoCm: number;
  anchoCm: number;
  largoCm: number;
  valorDeclarado: number;
}

export interface OpcionCotizacionMiCorreo {
  tipoServicio: TipoServicioMiCorreo;
  nombre: string;
  precio: number;
  plazoEstimado: string;
}

export interface ResultadoCotizacionMiCorreo {
  opciones: OpcionCotizacionMiCorreo[];
}

const MODO_STUB = !process.env.MICORREO_WEB_USUARIO;

const CACHE_TTL_MS = Number(process.env.MICORREO_QUOTE_CACHE_TTL_MS ?? 60 * 60 * 1000); // 1 hora
const MAX_CONCURRENT = Number(process.env.MICORREO_MAX_CONCURRENT ?? 1);

const OPCIONES_STUB: OpcionCotizacionMiCorreo[] = [
  { tipoServicio: 'PAQ_AR_HOY', nombre: 'PAQ.AR Hoy', precio: 6500, plazoEstimado: 'En el día' },
  { tipoServicio: 'PAQ_AR_EXPRESO', nombre: 'PAQ.AR Expreso', precio: 4800, plazoEstimado: 'De 1 a 3 días hábiles' },
  { tipoServicio: 'PAQ_AR_CLASICO', nombre: 'PAQ.AR Clásico', precio: 3500, plazoEstimado: 'De 2 a 5 días hábiles' },
];

// ---------------------------------------------------------------------------
// Caché en memoria (por cpDestino+pesoKg, TTL 1h — mismo criterio que
// andreaniQuote.service.ts: no incluye dimensiones en la clave a propósito).
// Acá el ahorro es todavía más importante: cada miss es un scrape completo
// (login + navegación), no un solo POST.
// ---------------------------------------------------------------------------

const quoteCache = new Map<string, { data: ResultadoCotizacionMiCorreo; expiresAtMs: number }>();

function claveCache(cpDestino: string, pesoKg: number): string {
  return `${cpDestino}:${pesoKg}`;
}

export function _resetCacheParaTests(): void {
  quoteCache.clear();
}

// ---------------------------------------------------------------------------
// Límite de concurrencia: cada cotización en vuelo es un Chromium completo
// más una sesión logueada sobre la misma cuenta de empresa, así que el
// default es mucho más conservador que el de Andreani (que era un simple
// POST HTTP). Default 1: se serializa por contenedor.
// ---------------------------------------------------------------------------

let enVuelo = 0;
const cola: (() => void)[] = [];

async function adquirirTurno(): Promise<void> {
  if (enVuelo < MAX_CONCURRENT) {
    enVuelo += 1;
    return;
  }
  await new Promise<void>((resolve) => cola.push(resolve));
  enVuelo += 1;
}

function liberarTurno(): void {
  enVuelo -= 1;
  const siguiente = cola.shift();
  if (siguiente) siguiente();
}

export function _resetRateLimitParaTests(): void {
  enVuelo = 0;
  cola.length = 0;
}

// ---------------------------------------------------------------------------
// Cotización
// ---------------------------------------------------------------------------

// Mismo criterio que Andreani: el código postal viene de texto libre
// (autocomplete de Mapbox o tipeado a mano), puede llegar como "5000", como
// CPA ("X5000AGF") o con basura alrededor. Se extraen los 4 dígitos.
const CP_DIGITOS_REGEX = /\d{4}/;

function extraerCpDeCuatroDigitos(cpCrudo: string): string | null {
  return cpCrudo.match(CP_DIGITOS_REGEX)?.[0] ?? null;
}

export async function getShippingQuotes(
  params: ParametrosCotizacionMiCorreo,
): Promise<ResultadoCotizacionMiCorreo> {
  const cpDestino = extraerCpDeCuatroDigitos(params.cpDestino);
  if (!cpDestino) {
    throw new MiCorreoQuoteError(`Código postal inválido: "${params.cpDestino}"`, 'INVALID_CP');
  }

  if (MODO_STUB) {
    return { opciones: OPCIONES_STUB };
  }

  const clave = claveCache(cpDestino, params.pesoKg);
  const cacheado = quoteCache.get(clave);
  if (cacheado && Date.now() < cacheado.expiresAtMs) {
    return cacheado.data;
  }

  await adquirirTurno();
  let page: Awaited<ReturnType<typeof scraper.iniciarSesionYObtenerPagina>> | null = null;
  try {
    page = await scraper.iniciarSesionYObtenerPagina();
    await scraper.navegarANuevoEnvio(page);
    await scraper.completarPaquete(
      page,
      { altoCm: params.altoCm, anchoCm: params.anchoCm, largoCm: params.largoCm },
      params.pesoKg,
      params.valorDeclarado,
    );
    const opcionesScrapeadas = await scraper.completarDestinoYExtraerTarifas(page, cpDestino, params.provinciaCodigo);

    const resultado: ResultadoCotizacionMiCorreo = {
      opciones: opcionesScrapeadas.map(({ tipoServicio, nombre, precio, plazoEstimado }) => ({
        tipoServicio,
        nombre,
        precio,
        plazoEstimado,
      })),
    };

    quoteCache.set(clave, { data: resultado, expiresAtMs: Date.now() + CACHE_TTL_MS });

    console.log(
      JSON.stringify({
        evento: 'cotizacion_micorreo',
        cp: cpDestino,
        pesoKg: params.pesoKg,
        opciones: resultado.opciones.length,
        timestamp: new Date().toISOString(),
      }),
    );

    return resultado;
  } catch (err) {
    if (err instanceof MiCorreoQuoteError) throw err;
    throw new MiCorreoQuoteError(
      `Error inesperado cotizando con MiCorreo: ${err instanceof Error ? err.message : String(err)}`,
      'TIMEOUT',
    );
  } finally {
    if (page) await scraper.cerrarPagina(page);
    liberarTurno();
  }
}
