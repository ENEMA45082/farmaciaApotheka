import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as favoritosController from '../controllers/favoritos.controller';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/favoritos:
 *   get:
 *     summary: Listar IDs de productos favoritos del usuario autenticado
 *     tags: [Favoritos]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de IDs de producto
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { type: string, format: uuid }
 */
router.get('/',                   favoritosController.listar);

/**
 * @openapi
 * /api/favoritos/{productoId}:
 *   post:
 *     summary: Agregar o quitar un producto de favoritos (toggle)
 *     tags: [Favoritos]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productoId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Estado resultante del favorito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 favorito: { type: boolean, description: 'true si quedó agregado, false si se quitó' }
 */
router.post('/:productoId',       favoritosController.toggle);

export default router;
