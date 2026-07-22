import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as pagosController from '../controllers/pagos.controller';
import { validate } from '../middlewares/validate';
import { pagarSchema, checkoutSchema } from '../schemas/pagos.schema';

const router = Router();

/**
 * @openapi
 * /api/pagos/pagar:
 *   post:
 *     summary: Pago directo con token de Payway
 *     tags: [Pagos]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pedidoId, token, bin]
 *             properties:
 *               pedidoId:        { type: string, format: uuid }
 *               token:           { type: string }
 *               bin:             { type: string }
 *               cuotas:          { type: integer, default: 1 }
 *               paymentMethodId: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Pago aprobado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:       { type: boolean }
 *                 pedidoId:      { type: string, format: uuid }
 *                 pw_payment_id: { type: string }
 *       402:
 *         description: Pago rechazado por la entidad
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 error:   { type: string }
 */
router.post('/pagar',              requireAuth, validate(pagarSchema), pagosController.pagar);

/**
 * @openapi
 * /api/pagos/checkout:
 *   post:
 *     summary: Generar URL de checkout hosted de Payway
 *     tags: [Pagos]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pedidoId]
 *             properties:
 *               pedidoId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: URL del formulario de pago hosteado por Payway
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checkoutUrl: { type: string }
 *       400:
 *         description: El pedido no está en estado pendiente de pago
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/checkout',           requireAuth, validate(checkoutSchema), pagosController.checkout);

/**
 * @openapi
 * /api/pagos/verificar/{pedidoId}:
 *   get:
 *     summary: Verificar activamente el estado de un pago en Payway
 *     description: Consulta a Payway el estado real del pago (en vez de depender solo del webhook) y actualiza el pedido si corresponde. Se usa al volver del checkout hosted.
 *     tags: [Pagos]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pedido (actualizado si Payway confirmó el pago)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       403:
 *         description: El pedido no pertenece al usuario autenticado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/verificar/:pedidoId', requireAuth, pagosController.verificarEstado);

/**
 * @openapi
 * /api/pagos/retorno-checkout/{pedidoId}:
 *   get:
 *     summary: Retorno del checkout hosteado de Payway (redirect_url)
 *     description: >
 *       Endpoint público al que Payway redirige el navegador del cliente después de pagar.
 *       Nunca confía en el query param "result" (lo arma el navegador) — lo usa solo como
 *       pista de qué transacción buscar, y verifica el pago real contra la API de Payway
 *       antes de confirmar el pedido. Siempre redirige (302) a la página del frontend.
 *     tags: [Pagos]
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: result
 *         required: false
 *         schema: { type: string }
 *         description: JSON del pago codificado en base64, agregado por Payway.
 *     responses:
 *       302:
 *         description: Redirige al frontend, haya podido confirmar el pago o no.
 */
router.get('/retorno-checkout/:pedidoId', pagosController.retornoCheckout);

/**
 * @openapi
 * /api/pagos/notificacion:
 *   post:
 *     summary: Webhook de notificaciones de Payway
 *     description: Endpoint público llamado por Payway server-to-server. Requiere el query param "secret" (compartido, embebido en la notifications_url al crear el checkout) para procesar la notificación.
 *     tags: [Pagos]
 *     parameters:
 *       - in: query
 *         name: secret
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Siempre responde 200 a Payway (incluso si el procesamiento interno falla) para evitar reintentos en loop
 *       401:
 *         description: Secreto ausente o inválido
 */
router.post('/notificacion',                    pagosController.notificacion);

export default router;
