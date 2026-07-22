import { Router } from 'express';
import * as bannersController from '../controllers/banners.controller';
import { requireAdmin, optionalAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { crearBannerSchema, actualizarBannerSchema } from '../schemas/banners.schema';

const router = Router();

/**
 * @openapi
 * /api/banners:
 *   get:
 *     summary: Listar banners del carrusel de la home
 *     description: >
 *       Endpoint público. Sin token de administrador devuelve solo los
 *       banners activos, ordenados por `orden`. Con token de administrador
 *       válido incluye también los inactivos.
 *     tags: [Banners]
 *     security:
 *       - {}
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de banners
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Banner' }
 *   post:
 *     summary: Crear banner
 *     tags: [Banners]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imagen_url, alt_texto]
 *             properties:
 *               imagen_url: { type: string }
 *               link_url:   { type: string, nullable: true }
 *               alt_texto:  { type: string }
 *               orden:      { type: integer }
 *     responses:
 *       201:
 *         description: Banner creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Banner' }
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Se requiere rol admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/',  optionalAuth, bannersController.listar);
router.post('/', requireAdmin, validate(crearBannerSchema), bannersController.crear);

/**
 * @openapi
 * /api/banners/{id}:
 *   put:
 *     summary: Actualizar banner
 *     tags: [Banners]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imagen_url: { type: string }
 *               link_url:   { type: string, nullable: true }
 *               alt_texto:  { type: string }
 *               orden:      { type: integer }
 *               activo:     { type: boolean }
 *     responses:
 *       200:
 *         description: Banner actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Banner' }
 *       403:
 *         description: Se requiere rol admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Banner no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   delete:
 *     summary: Eliminar banner
 *     tags: [Banners]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Banner eliminado
 *       403:
 *         description: Se requiere rol admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Banner no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.put('/:id',    requireAdmin, validate(actualizarBannerSchema), bannersController.actualizar);
router.delete('/:id', requireAdmin, bannersController.eliminar);

export default router;
