import { Router } from 'express';
import * as bannersController from '../controllers/banners.controller';
import { requiereAdmin, autenticacionOpcional } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import { crearBannerSchema, actualizarBannerSchema } from '../schemas/banners.schema';

const router = Router();

router.get('/',  autenticacionOpcional, bannersController.listar);
router.post('/', requiereAdmin, validar(crearBannerSchema), bannersController.crear);

router.put('/:id',    requiereAdmin, validar(actualizarBannerSchema), bannersController.actualizar);
router.delete('/:id', requiereAdmin, bannersController.eliminar);

export default router;
