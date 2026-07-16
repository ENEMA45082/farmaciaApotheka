import { Router } from 'express';
import * as estadosController from '../controllers/estados.controller';

const router = Router();

/**
 * @openapi
 * /api/estados:
 *   get:
 *     summary: Listar catálogo de estados de pedido
 *     description: >
 *       Catálogo público de referencia (id, nombre, descripción, orden,
 *       es_final) usado para mostrar/traducir el campo `estado` de un
 *       Pedido. No define la máquina de estados (transiciones válidas) —
 *       eso es lógica de negocio interna del backend.
 *     tags: [Estados]
 *     responses:
 *       200:
 *         description: Lista de estados ordenada por el flujo del pedido
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Estado' }
 */
router.get('/', estadosController.listar);

export default router;
