import { Router } from 'express';
import * as cuponesController from '../controllers/cupones.controller';
import { requiereAutenticacion, requiereAdmin } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import { crearCuponSchema, actualizarCuponSchema, validarCuponSchema } from '../schemas/cupones.schema';

const router = Router();

router.post('/validar', requiereAutenticacion, validar(validarCuponSchema), cuponesController.validar);

router.post('/',         requiereAdmin, validar(crearCuponSchema), cuponesController.crear);
router.get('/admin',     requiereAdmin, cuponesController.listarAdmin);
router.patch('/:id',     requiereAdmin, validar(actualizarCuponSchema), cuponesController.actualizar);

export default router;
