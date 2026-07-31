import { Router } from 'express';
import { requiereAdmin } from '../middlewares/autenticacion.middleware';
import * as estadisticasController from '../controllers/estadisticas.controller';

const router = Router();

router.get('/', requiereAdmin, estadisticasController.obtenerEstadisticas);

export default router;
