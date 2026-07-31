import { Router } from 'express';
import * as direccionesController from '../controllers/direcciones.controller';
import { requiereAutenticacion } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import { guardarDireccionSchema } from '../schemas/direcciones.schema';

const router = Router();

router.use(requiereAutenticacion);

router.get('/', direccionesController.obtener);
router.put('/', validar(guardarDireccionSchema), direccionesController.guardar);

export default router;
