import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import * as estadisticasController from '../controllers/estadisticas.controller';

const router = Router();

/**
 * @openapi
 * /api/estadisticas:
 *   get:
 *     summary: Dashboard de estadísticas de inventario y ventas
 *     tags: [Estadísticas]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas agregadas (calculadas en la base de datos)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Estructura calculada por la función obtener_estadisticas_inventario()
 *       403:
 *         description: Se requiere rol admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/', requireAdmin, estadisticasController.obtenerEstadisticas);

export default router;
