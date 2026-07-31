import { Router } from 'express';
import { requiereAdmin } from '../middlewares/autenticacion.middleware';
import * as facturasController from '../controllers/facturas.controller';

const router = Router();

router.get('/admin/errores', requiereAdmin, facturasController.listarConProblemas);

export default router;
