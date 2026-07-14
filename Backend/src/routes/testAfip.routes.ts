import { Router, type Response } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import { AppError } from '../errors/AppError';
import { obtenerUltimoComprobanteAutorizado, solicitarComprobantePrueba } from '../services/facturacion.service';

/**
 * ENDPOINT TEMPORAL DE DEBUGGING - eliminar (o reforzar) antes de ir a producción.
 *
 * GET  /: consulta FECompUltimoAutorizado (solo lectura, no emite nada).
 * POST /: solicita un CAE real (FECAESolicitar) para un comprobante de PRUEBA en
 *         homologación, sin validez fiscal. Es una acción real contra ARCA: cada
 *         llamada consume un número de comprobante.
 *
 * Ver TEST_AFIP.md en la raíz del backend para instrucciones de prueba.
 */
const router = Router();

function responderError(res: Response, err: unknown): void {
  const statusCode = err instanceof AppError ? err.statusCode : 502;
  const detalle = err instanceof Error ? err.message : String(err);
  const textoCompleto = `${detalle} ${JSON.stringify((err as { data?: unknown })?.data ?? '')}`;

  let pista: string | undefined;
  if (textoCompleto.includes('10016')) {
    pista = 'Error 10016: el número de comprobante enviado no es el siguiente al último autorizado '
      + '(alguien más pudo haber emitido un comprobante mientras tanto). Volvé a consultar GET /api/test-afip '
      + 'para obtener el último número real y reintentá.';
  } else if (textoCompleto.includes('10242')) {
    pista = 'Error 10242: falta o es inválida la condición de IVA del receptor (CondicionIVAReceptorId). '
      + 'Verificá que el payload incluya ese campo (5 = Consumidor Final).';
  }

  // Se expone el error crudo de AFIP SDK (message/code/status/data) porque este
  // endpoint es solo para debugging manual, nunca para uso en el frontend.
  res.status(statusCode).json({
    ok: false,
    error: detalle,
    ...(pista ? { pista } : {}),
    detalleCompleto: err,
  });
}

router.get('/', requireAdmin, async (req, res) => {
  try {
    const puntoVenta = req.query.puntoVenta !== undefined ? Number(req.query.puntoVenta) : undefined;
    const tipoComprobante = req.query.tipoComprobante !== undefined ? Number(req.query.tipoComprobante) : undefined;

    const resultado = await obtenerUltimoComprobanteAutorizado(puntoVenta, tipoComprobante);

    res.json({
      ok: true,
      ambiente: process.env.ARCA_PRODUCCION === 'true' ? 'produccion' : 'homologacion',
      cuit: process.env.ARCA_CUIT,
      ...resultado,
    });
  } catch (err) {
    responderError(res, err);
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { puntoVenta, tipoComprobante, importeTotal, docTipo, docNro } = req.body ?? {};

    const resultado = await solicitarComprobantePrueba({
      puntoVenta: puntoVenta !== undefined ? Number(puntoVenta) : undefined,
      tipoComprobante: tipoComprobante !== undefined ? Number(tipoComprobante) : undefined,
      importeTotal: importeTotal !== undefined ? Number(importeTotal) : undefined,
      docTipo: docTipo !== undefined ? Number(docTipo) : undefined,
      docNro: docNro !== undefined ? Number(docNro) : undefined,
    });

    res.json({
      ok: true,
      ambiente: process.env.ARCA_PRODUCCION === 'true' ? 'produccion' : 'homologacion',
      cuit: process.env.ARCA_CUIT,
      ...resultado,
    });
  } catch (err) {
    responderError(res, err);
  }
});

export default router;
