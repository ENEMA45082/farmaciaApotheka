import { Router } from 'express';
import * as direccionesController from '../controllers/direcciones.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', direccionesController.obtener);
router.put('/', direccionesController.guardar);

export default router;
