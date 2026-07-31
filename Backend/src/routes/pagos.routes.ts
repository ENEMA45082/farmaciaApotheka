import { Router } from 'express';
import { requiereAutenticacion } from '../middlewares/autenticacion.middleware';
import * as pagosController from '../controllers/pagos.controller';
import { validar } from '../middlewares/validar';
import { limitadorPagos, limitadorPagosCallback } from '../middlewares/limitadorSolicitudes';
import { pagarSchema, checkoutSchema } from '../schemas/pagos.schema';

const router = Router();

router.post('/pagar',              requiereAutenticacion, limitadorPagos, validar(pagarSchema), pagosController.pagar);

router.post('/checkout',           requiereAutenticacion, limitadorPagos, validar(checkoutSchema), pagosController.checkout);

router.get('/verificar/:pedidoId', requiereAutenticacion, limitadorPagosCallback, pagosController.verificarEstado);

router.get('/retorno-checkout/:pedidoId', limitadorPagosCallback, pagosController.retornoCheckout);

router.post('/notificacion',       limitadorPagosCallback, pagosController.notificacion);

export default router;
