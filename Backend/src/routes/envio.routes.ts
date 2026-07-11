import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as envioController from '../controllers/envio.controller';

const router = Router();

/**
 * @openapi
 * /api/envio/cotizar:
 *   post:
 *     summary: Cotizar el costo de envío a domicilio o a sucursal (Correo Argentino)
 *     tags: [Envío]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [codigoPostal, items]
 *             properties:
 *               codigoPostal: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     peso_gramos: { type: number }
 *                     cantidad:    { type: integer }
 *     responses:
 *       200:
 *         description: Costo y plazo estimado de envío
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 precio:      { type: number }
 *                 diasHabiles: { type: string }
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/cotizar',   requireAuth, envioController.cotizar);

/**
 * @openapi
 * /api/envio/sucursales:
 *   get:
 *     summary: Listar sucursales de Correo Argentino cercanas a un código postal
 *     tags: [Envío]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: codigoPostal
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sucursales disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   nombre:    { type: string }
 *                   direccion: { type: string }
 */
router.get('/sucursales', requireAuth, envioController.sucursales);

export default router;
