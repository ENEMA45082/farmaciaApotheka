import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as pagosController from '../controllers/pagos.controller';

const router = Router();

router.post('/pagar',        requireAuth, pagosController.pagar);
router.post('/checkout',     requireAuth, pagosController.checkout);
router.post('/notificacion',             pagosController.notificacion);

export default router;
