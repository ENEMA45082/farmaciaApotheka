import { Router } from 'express';
import * as pedidosController from '../controllers/pedidos.controller';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/pedidos/admin:
 *   get:
 *     summary: Listar todos los pedidos (admin)
 *     tags: [Pedidos]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista paginada de pedidos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Pedido' }
 *       403:
 *         description: Se requiere rol admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/admin',              requireAdmin, pedidosController.listarAdmin);

/**
 * @openapi
 * /api/pedidos/admin/{id}:
 *   get:
 *     summary: Detalle de un pedido (admin) — incluye datos de cliente, dirección y factura
 *     tags: [Pedidos]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detalle completo del pedido
 *       404:
 *         description: Pedido no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/admin/:id',          requireAdmin, pedidosController.obtenerPorIdAdmin);

/**
 * @openapi
 * /api/pedidos/{id}/estado:
 *   patch:
 *     summary: Cambiar el estado de un pedido (admin)
 *     description: Valida que la transición sea válida según la máquina de estados del pedido.
 *     tags: [Pedidos]
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
 *             required: [estado]
 *             properties:
 *               estado: { type: string, enum: [PendienteDePago, Confirmado, EnPreparacion, Enviado, ListoParaRetirar, Entregado, Cancelado] }
 *     responses:
 *       200:
 *         description: Pedido actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       400:
 *         description: Transición de estado inválida
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.patch('/:id/estado',       requireAdmin, pedidosController.cambiarEstadoAdmin);

/**
 * @openapi
 * /api/pedidos/{id}/cancelar-admin:
 *   patch:
 *     summary: Cancelar un pedido con motivo (admin) — restaura el stock
 *     tags: [Pedidos]
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
 *             required: [motivo]
 *             properties:
 *               motivo: { type: string, enum: [sin_stock, pago_no_recibido, pago_rechazado, solicitado_por_cliente, error_direccion, otro] }
 *     responses:
 *       200:
 *         description: Pedido cancelado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 */
router.patch('/:id/cancelar-admin', requireAdmin, pedidosController.cancelarPedidoAdmin);

/**
 * @openapi
 * /api/pedidos/{id}/reintentar-factura:
 *   post:
 *     summary: Reintentar la emisión de factura de un pedido (admin)
 *     tags: [Pedidos]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Resultado del reintento
 *       404:
 *         description: Pedido no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/:id/reintentar-factura', requireAdmin, pedidosController.reintentarFactura);

/**
 * @openapi
 * /api/pedidos:
 *   post:
 *     summary: Crear pedido (descuenta stock atómicamente)
 *     tags: [Pedidos]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, metodo_envio, metodo_pago]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     producto_id:     { type: string, format: uuid }
 *                     cantidad:        { type: integer }
 *               metodo_envio: { type: string, enum: [retiro_farmacia, domicilio, retiro_sucursal] }
 *               metodo_pago:  { type: string, enum: [tarjeta, transferencia, efectivo] }
 *     responses:
 *       201:
 *         description: Pedido creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       400:
 *         description: Stock insuficiente o datos inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   get:
 *     summary: Listar pedidos propios
 *     tags: [Pedidos]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Pedidos del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Pedido' }
 */
router.post('/',              requireAuth,  pedidosController.crear);
router.get('/',               requireAuth,  pedidosController.listar);

/**
 * @openapi
 * /api/pedidos/{id}:
 *   get:
 *     summary: Detalle de un pedido propio
 *     description: Verifica que el pedido pertenezca al usuario autenticado (403 si no).
 *     tags: [Pedidos]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pedido encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       403:
 *         description: El pedido no pertenece al usuario autenticado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Pedido no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:id',            requireAuth,  pedidosController.obtenerPorId);

/**
 * @openapi
 * /api/pedidos/{id}/cancelar:
 *   patch:
 *     summary: Cancelar un pedido propio — restaura el stock
 *     tags: [Pedidos]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pedido cancelado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       400:
 *         description: El pedido ya está en un estado final
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.patch('/:id/cancelar', requireAuth,  pedidosController.cancelar);

/**
 * @openapi
 * /api/pedidos/{id}/tracking:
 *   get:
 *     summary: Tracking de envío del pedido (Correo Argentino)
 *     tags: [Pedidos]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Estado de tracking del envío
 *       404:
 *         description: Pedido no encontrado o sin envío asociado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:id/tracking',   requireAuth,  pedidosController.tracking);

export default router;
