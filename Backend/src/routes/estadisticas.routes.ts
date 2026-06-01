import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import * as estadisticasController from '../controllers/estadisticas.controller';

const router = Router();

router.get('/', requireAdmin, estadisticasController.obtenerEstadisticas);

export default router;
