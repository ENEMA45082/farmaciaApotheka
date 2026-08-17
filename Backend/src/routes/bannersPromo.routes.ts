import { Router } from 'express';
import * as bannersPromoController from '../controllers/bannersPromo.controller';
import { requiereAdmin } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import { crearBannerPromoSchema, actualizarBannerPromoSchema } from '../schemas/bannersPromo.schema';

const router = Router();

router.get('/',       bannersPromoController.listar);
router.get('/admin',  requiereAdmin, bannersPromoController.listarAdmin);
router.post('/', requiereAdmin, validar(crearBannerPromoSchema), bannersPromoController.crear);

router.put('/:id',    requiereAdmin, validar(actualizarBannerPromoSchema), bannersPromoController.actualizar);
router.delete('/:id', requiereAdmin, bannersPromoController.eliminar);

export default router;
