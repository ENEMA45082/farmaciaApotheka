import { Router } from 'express';
import * as direccionesController from '../controllers/direcciones.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { guardarDireccionSchema } from '../schemas/direcciones.schema';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/direcciones:
 *   get:
 *     summary: Obtener la dirección de envío del usuario autenticado
 *     tags: [Direcciones]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dirección del usuario (null si no cargó ninguna todavía)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Direccion' }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   put:
 *     summary: Crear o actualizar la dirección de envío del usuario (upsert)
 *     tags: [Direcciones]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Direccion' }
 *     responses:
 *       200:
 *         description: Dirección guardada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Direccion' }
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/', direccionesController.obtener);
router.put('/', validate(guardarDireccionSchema), direccionesController.guardar);

export default router;
