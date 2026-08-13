import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.MICORREO_WEB_USUARIO = 'test-user';
  process.env.MICORREO_WEB_PASSWORD = 'test-pass';
});

const {
  iniciarSesionYObtenerPaginaMock,
  navegarANuevoEnvioMock,
  completarPaqueteMock,
  completarDestinoYExtraerTarifasMock,
  cerrarPaginaMock,
} = vi.hoisted(() => ({
  iniciarSesionYObtenerPaginaMock: vi.fn(),
  navegarANuevoEnvioMock: vi.fn(),
  completarPaqueteMock: vi.fn(),
  completarDestinoYExtraerTarifasMock: vi.fn(),
  cerrarPaginaMock: vi.fn(),
}));

vi.mock('./micorreoScraper', () => ({
  iniciarSesionYObtenerPagina: iniciarSesionYObtenerPaginaMock,
  navegarANuevoEnvio: navegarANuevoEnvioMock,
  completarPaquete: completarPaqueteMock,
  completarDestinoYExtraerTarifas: completarDestinoYExtraerTarifasMock,
  cerrarPagina: cerrarPaginaMock,
}));

import { getShippingQuotes, _resetCacheParaTests, _resetRateLimitParaTests } from './micorreoCotizacion.service';
import { MiCorreoQuoteError } from '../errors/MiCorreoQuoteError';

const PARAMS = { cpDestino: '1425', provinciaCodigo: 'C' as const, pesoKg: 1, altoCm: 20, anchoCm: 15, largoCm: 10, valorDeclarado: 1000 };

const OPCIONES_SCRAPEADAS = [
  { tipoServicio: 'PAQ_AR_HOY' as const, nombre: 'PAQ.AR Hoy', precio: 6500, plazoEstimado: 'En el día' },
  { tipoServicio: 'PAQ_AR_EXPRESO' as const, nombre: 'PAQ.AR Expreso', precio: 4800, plazoEstimado: 'De 1 a 3 días hábiles' },
  { tipoServicio: 'PAQ_AR_CLASICO' as const, nombre: 'PAQ.AR Clásico', precio: 3500, plazoEstimado: 'De 2 a 5 días hábiles' },
];

beforeEach(() => {
  _resetCacheParaTests();
  _resetRateLimitParaTests();
  iniciarSesionYObtenerPaginaMock.mockReset().mockResolvedValue({});
  navegarANuevoEnvioMock.mockReset().mockResolvedValue(undefined);
  completarPaqueteMock.mockReset().mockResolvedValue(undefined);
  completarDestinoYExtraerTarifasMock.mockReset().mockResolvedValue(OPCIONES_SCRAPEADAS);
  cerrarPaginaMock.mockReset().mockResolvedValue(undefined);
});

describe('getShippingQuotes', () => {
  it('devuelve las opciones scrapeadas', async () => {
    const resultado = await getShippingQuotes(PARAMS);
    expect(resultado.opciones).toEqual(OPCIONES_SCRAPEADAS);
  });

  it('rechaza un código postal con formato inválido sin abrir un browser', async () => {
    await expect(getShippingQuotes({ ...PARAMS, cpDestino: 'abc' })).rejects.toMatchObject({
      quoteCode: 'INVALID_CP',
    });
    expect(iniciarSesionYObtenerPaginaMock).not.toHaveBeenCalled();
  });

  it('acepta CP en formato CPA (ej: "X1425AGF") extrayendo los 4 dígitos', async () => {
    await getShippingQuotes({ ...PARAMS, cpDestino: 'X1425AGF' });

    expect(completarDestinoYExtraerTarifasMock).toHaveBeenCalledWith(expect.anything(), '1425', 'C');
  });

  it('usa la caché en memoria: dos llamadas iguales solo scrapean una vez', async () => {
    await getShippingQuotes(PARAMS);
    await getShippingQuotes(PARAMS);

    expect(iniciarSesionYObtenerPaginaMock).toHaveBeenCalledTimes(1);
  });

  it('la caché ignora dimensiones distintas si cp+peso coinciden (clave documentada)', async () => {
    await getShippingQuotes(PARAMS);
    await getShippingQuotes({ ...PARAMS, altoCm: 99, anchoCm: 99, largoCm: 99 });

    expect(iniciarSesionYObtenerPaginaMock).toHaveBeenCalledTimes(1);
  });

  it('propaga instancias de MiCorreoQuoteError sin volver a envolverlas', async () => {
    completarPaqueteMock.mockRejectedValueOnce(new MiCorreoQuoteError('login falló', 'LOGIN_FAILED'));

    try {
      await getShippingQuotes(PARAMS);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(MiCorreoQuoteError);
      expect((err as MiCorreoQuoteError).quoteCode).toBe('LOGIN_FAILED');
    }
  });

  it('envuelve errores desconocidos del scraper con un MiCorreoQuoteError', async () => {
    iniciarSesionYObtenerPaginaMock.mockRejectedValueOnce(new Error('boom'));

    await expect(getShippingQuotes(PARAMS)).rejects.toBeInstanceOf(MiCorreoQuoteError);
  });

  it('cierra la página siempre, incluso si el scraping falla', async () => {
    completarPaqueteMock.mockRejectedValueOnce(new Error('boom'));

    await expect(getShippingQuotes(PARAMS)).rejects.toThrow();
    expect(cerrarPaginaMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Modo stub: sin MICORREO_WEB_USUARIO configurado, no se lanza ningún
// browser — se devuelven 3 tarifas simuladas (mismo patrón que
// correoArgentino.service.ts). MODO_STUB se calcula una sola vez al cargar
// el módulo, así que hace falta un reset + reimport dinámico para probarlo.
// ---------------------------------------------------------------------------
describe('modo stub', () => {
  it('devuelve tarifas simuladas sin llamar al scraper cuando no hay credenciales', async () => {
    const usuarioPrevio = process.env.MICORREO_WEB_USUARIO;
    delete process.env.MICORREO_WEB_USUARIO;
    vi.resetModules();

    try {
      const { getShippingQuotes: getShippingQuotesStub } = await import('./micorreoCotizacion.service');
      const resultado = await getShippingQuotesStub(PARAMS);

      expect(resultado.opciones.length).toBeGreaterThan(0);
      expect(iniciarSesionYObtenerPaginaMock).not.toHaveBeenCalled();
    } finally {
      process.env.MICORREO_WEB_USUARIO = usuarioPrevio;
      vi.resetModules();
    }
  });
});
