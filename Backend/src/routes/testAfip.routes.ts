import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import { AppError } from '../errors/AppError';
import { obtenerUltimoComprobanteAutorizado } from '../services/facturacion.service';

/**
 * ENDPOINT TEMPORAL DE DEBUGGING - eliminar (o reforzar) antes de ir a producción.
 *
 * Solo valida la conexión con AFIP SDK/ARCA en homologación. No emite ningún
 * comprobante: consulta FECompUltimoAutorizado (último autorizado para un punto
 * de venta + tipo de comprobante), que es de solo lectura.
 *
 * Ver TEST_AFIP.md en la raíz del backend para instrucciones de prueba.
 */
const router = Router();

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
    const statusCode = err instanceof AppError ? err.statusCode : 502;
    const detalle = err instanceof Error ? err.message : String(err);
    // Se exponen los campos crudos del error de AFIP SDK (code/status/data) porque
    // este endpoint es solo para debugging manual, nunca para uso en el frontend.
    res.status(statusCode).json({
      ok: false,
      error: detalle,
      detalleCompleto: err,
    });
  }
});

export default router;
