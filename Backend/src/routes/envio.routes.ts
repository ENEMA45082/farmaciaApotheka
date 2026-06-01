import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as envioController from '../controllers/envio.controller';

const router = Router();

router.post('/cotizar',   requireAuth, envioController.cotizar);
router.get('/sucursales', requireAuth, envioController.sucursales);

export default router;
