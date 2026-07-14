import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import { AppError } from '../errors/AppError';
import {
  verificarConexionProduccion,
  obtenerUltimoComprobanteProduccion,
  solicitarComprobanteProduccion,
  generarPdfFacturaProduccion,
  PUNTO_VENTA_WEB_PRODUCCION,
} from '../services/facturacionProduccion.service';

/**
 * ⚠️ ENDPOINT TEMPORAL — CONTRA ARCA PRODUCCIÓN REAL (CUIT 30677539743).
 *
 * GET  /                  : FEDummy (chequeo de estado, solo lectura).
 * GET  /ultimo-comprobante: FECompUltimoAutorizado (solo lectura).
 * POST /emitir            : FECAESolicitar — genera un comprobante fiscal
 *                            REAL e IRREVERSIBLE. Se usó una única vez, con
 *                            confirmación explícita del usuario paso a paso,
 *                            para validar el circuito de emisión real (punto
 *                            de venta 6, Factura B, Consumidor Final, $121).
 * GET  /pdf-factura-1     : CreatePDF de esa misma Factura B N°1 ya emitida
 *                            (no emite nada nuevo, solo lectura/render).
 *
 * Separado por completo de `testAfip.routes.ts` (homologación) para que sea
 * imposible confundirlos. Eliminar (o reforzar) antes de dejarlo así en
 * producción de forma permanente. Ver TEST_AFIP_PRODUCCION.md.
 */
const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  // Fricción extra a propósito: esto pega contra ARCA real, no alcanza con
  // tener el token de admin, hay que confirmar explícitamente por query string.
  if (req.query.confirmo !== 'produccion') {
    res.status(400).json({
      ok: false,
      error: 'Falta confirmar: agregá ?confirmo=produccion a la URL para ejecutar este chequeo contra ARCA producción real.',
    });
    return;
  }

  try {
    const resultado = await verificarConexionProduccion();
    res.json({ ok: true, ambiente: 'produccion', ...resultado });
  } catch (err) {
    const statusCode = err instanceof AppError ? err.statusCode : 502;
    const detalle = err instanceof Error ? err.message : String(err);
    // Se expone el error crudo de AFIP SDK porque este endpoint es solo para
    // debugging manual, nunca para uso en el frontend.
    res.status(statusCode).json({ ok: false, error: detalle, detalleCompleto: err });
  }
});

// Consulta de solo lectura (FECompUltimoAutorizado) para el punto de venta 6
// (web, producción) — PUNTO_VENTA_WEB_PRODUCCION, NUNCA el 5 (MercadoLibre).
// Requiere pasar puntoVenta/tipoComprobante explícitos por query string para
// que nunca quede ambiguo qué se está consultando en producción.
router.get('/ultimo-comprobante', requireAdmin, async (req, res) => {
  if (req.query.confirmo !== 'produccion') {
    res.status(400).json({
      ok: false,
      error: 'Falta confirmar: agregá ?confirmo=produccion a la URL para consultar contra ARCA producción real.',
    });
    return;
  }

  const puntoVenta = req.query.puntoVenta !== undefined ? Number(req.query.puntoVenta) : undefined;
  const tipoComprobante = req.query.tipoComprobante !== undefined ? Number(req.query.tipoComprobante) : undefined;

  if (puntoVenta === undefined || tipoComprobante === undefined) {
    res.status(400).json({
      ok: false,
      error: `Faltan parámetros: pasá ?puntoVenta=&tipoComprobante= explícitos. `
        + `Para el punto de venta web de producción, usá puntoVenta=${PUNTO_VENTA_WEB_PRODUCCION} (NUNCA 5, que es de MercadoLibre).`,
    });
    return;
  }

  try {
    const resultado = await obtenerUltimoComprobanteProduccion(puntoVenta, tipoComprobante);
    res.json({ ok: true, ambiente: 'produccion', cuit: process.env.ARCA_PROD_CUIT, ...resultado });
  } catch (err) {
    const statusCode = err instanceof AppError ? err.statusCode : 502;
    const detalle = err instanceof Error ? err.message : String(err);
    res.status(statusCode).json({ ok: false, error: detalle, detalleCompleto: err });
  }
});

// ⚠️ FECAESolicitar contra ARCA PRODUCCIÓN REAL — genera un comprobante fiscal
// real e irreversible. Doble fricción a propósito: ?confirmo=produccion en la
// URL Y "confirmoEmisionReal": true en el body. Todos los datos del comprobante
// son obligatorios y explícitos, sin ningún default.
router.post('/emitir', requireAdmin, async (req, res) => {
  if (req.query.confirmo !== 'produccion') {
    res.status(400).json({
      ok: false,
      error: 'Falta confirmar: agregá ?confirmo=produccion a la URL para emitir contra ARCA producción real.',
    });
    return;
  }

  const { puntoVenta, tipoComprobante, importeTotal, docTipo, docNro, confirmoEmisionReal } = req.body ?? {};

  if (confirmoEmisionReal !== true) {
    res.status(400).json({
      ok: false,
      error: 'Falta confirmar: el body debe incluir "confirmoEmisionReal": true. '
        + 'Esto va a emitir un comprobante fiscal REAL e IRREVERSIBLE en producción.',
    });
    return;
  }

  if ([puntoVenta, tipoComprobante, importeTotal, docTipo, docNro].some(v => v === undefined)) {
    res.status(400).json({
      ok: false,
      error: 'Faltan campos obligatorios en el body: puntoVenta, tipoComprobante, importeTotal, docTipo, docNro '
        + `(todos explícitos, sin default; el punto de venta web es ${PUNTO_VENTA_WEB_PRODUCCION}, NUNCA 5 que es de MercadoLibre).`,
    });
    return;
  }

  try {
    const resultado = await solicitarComprobanteProduccion({
      puntoVenta: Number(puntoVenta),
      tipoComprobante: Number(tipoComprobante),
      importeTotal: Number(importeTotal),
      docTipo: Number(docTipo),
      docNro: Number(docNro),
    });
    res.json({ ok: true, ambiente: 'produccion', cuit: process.env.ARCA_PROD_CUIT, ...resultado });
  } catch (err) {
    const statusCode = err instanceof AppError ? err.statusCode : 502;
    const detalle = err instanceof Error ? err.message : String(err);
    res.status(statusCode).json({ ok: false, error: detalle, detalleCompleto: err });
  }
});

// Genera el PDF de la Factura B N°1 (PtoVta 6) ya emitida el 2026-07-13 — NO emite
// nada nuevo, solo llama a CreatePDF con los datos reales de ese comprobante
// (hardcodeados a propósito, para no arriesgar un typo de CAE pasándolo a mano).
router.get('/pdf-factura-1', requireAdmin, async (req, res) => {
  if (req.query.confirmo !== 'produccion') {
    res.status(400).json({
      ok: false,
      error: 'Falta confirmar: agregá ?confirmo=produccion a la URL.',
    });
    return;
  }

  try {
    const { buffer, nombreArchivo, rutaGuardada } = await generarPdfFacturaProduccion({
      puntoVenta: 6,
      tipoComprobante: 6, // Factura B
      numeroComprobante: 1,
      cae: '86283753417803',
      caeVencimiento: '2026-07-23',
      fechaEmision: new Date(2026, 6, 13), // 13/07/2026
      importeNeto: 100,
      importeIva: 21,
      importeTotal: 121,
      docTipo: 99, // Consumidor Final
      docNro: 0,
    });

    console.log(`[test-afip-produccion] PDF guardado en ${rutaGuardada}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(buffer);
  } catch (err) {
    const statusCode = err instanceof AppError ? err.statusCode : 502;
    const detalle = err instanceof Error ? err.message : String(err);
    res.status(statusCode).json({ ok: false, error: detalle, detalleCompleto: err });
  }
});

export default router;
