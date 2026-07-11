import { Router } from 'express';
import * as categoriasController from '../controllers/categorias.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/categorias:
 *   get:
 *     summary: Listar categorías (lista plana)
 *     tags: [Categorías]
 *     responses:
 *       200:
 *         description: Lista de categorías
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Categoria' }
 *   post:
 *     summary: Crear categoría
 *     tags: [Categorías]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre:   { type: string }
 *               id_padre: { type: string, format: uuid, nullable: true }
 *     responses:
 *       201:
 *         description: Categoría creada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Categoria' }
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
router.get('/',        categoriasController.listar);

/**
 * @openapi
 * /api/categorias/arbol:
 *   get:
 *     summary: Árbol jerárquico de categorías
 *     tags: [Categorías]
 *     responses:
 *       200:
 *         description: Categorías raíz con sus hijos anidados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Categoria' }
 */
router.get('/arbol',   categoriasController.obtenerArbol);

/**
 * @openapi
 * /api/categorias/{id}:
 *   get:
 *     summary: Obtener categoría por ID
 *     tags: [Categorías]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Categoria' }
 *       404:
 *         description: Categoría no encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   put:
 *     summary: Actualizar categoría
 *     tags: [Categorías]
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
 *               nombre:   { type: string }
 *               id_padre: { type: string, format: uuid, nullable: true }
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Categoria' }
 *       403:
 *         description: Se requiere rol admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   delete:
 *     summary: Eliminar categoría
 *     description: Falla con 409 si la categoría o alguna de sus subcategorías tiene productos asociados.
 *     tags: [Categorías]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Categoría eliminada
 *       403:
 *         description: Se requiere rol admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: La categoría (o sus subcategorías) tiene productos asociados
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:id',     categoriasController.obtenerPorId);
router.post('/',      requireAdmin, categoriasController.crear);
router.put('/:id',    requireAdmin, categoriasController.actualizar);
router.delete('/:id', requireAdmin, categoriasController.eliminar);

export default router;
