import { Router } from 'express';
import * as perfilController from '../controllers/perfil.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { actualizarPerfilSchema } from '../schemas/perfil.schema';

const router = Router();

/**
 * @openapi
 * /api/perfil:
 *   get:
 *     summary: Obtener el perfil del usuario autenticado
 *     description: Si es la primera vez que se accede, crea la fila del perfil completando nombre/apellido con los datos de Google si el usuario entró por OAuth.
 *     tags: [Perfil]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nombre:              { type: string, nullable: true }
 *                 apellido:            { type: string, nullable: true }
 *                 dni:                 { type: string, nullable: true }
 *                 telefono:            { type: string, nullable: true }
 *                 fecha_nacimiento:    { type: string, format: date, nullable: true }
 *                 genero:              { type: string, nullable: true }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   put:
 *     summary: Actualizar el perfil del usuario autenticado
 *     tags: [Perfil]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:           { type: string }
 *               apellido:         { type: string }
 *               dni:              { type: string }
 *               telefono:         { type: string }
 *               fecha_nacimiento: { type: string, format: date }
 *               genero:           { type: string }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/', requireAuth, perfilController.obtener);
router.put('/', requireAuth, validate(actualizarPerfilSchema), perfilController.actualizar);

export default router;
