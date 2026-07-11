import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import * as facturasController from '../controllers/facturas.controller';

const router = Router();

/**
 * @openapi
 * /api/facturas/admin/errores:
 *   get:
 *     summary: Listar facturas con problemas (fallo de emisión o sin PDF generado)
 *     tags: [Facturas]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Facturas en estado "error", o "emitida" sin pdf_url
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - { $ref: '#/components/schemas/Factura' }
 *                   - type: object
 *                     properties:
 *                       problema: { type: string, enum: [error, sin_pdf] }
 *       403:
 *         description: Se requiere rol admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/admin/errores', requireAdmin, facturasController.listarConProblemas);

export default router;
