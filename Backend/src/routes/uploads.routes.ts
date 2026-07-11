import { Router } from 'express';
import { uploadMiddleware, subirImagenes } from '../controllers/uploads.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/uploads:
 *   post:
 *     summary: Subir imágenes de productos
 *     description: Hasta 5 archivos de máximo 5 MB cada uno, tipo image/*.
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagenes:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: URLs públicas de las imágenes subidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 urls:
 *                   type: array
 *                   items: { type: string }
 *       400:
 *         description: Archivo inválido o límite excedido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Se requiere rol admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/', requireAdmin, uploadMiddleware, subirImagenes);

export default router;
