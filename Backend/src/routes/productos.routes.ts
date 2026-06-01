import { Router } from 'express';
import * as productosController from '../controllers/productos.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/',       productosController.listar);
router.get('/:id',    productosController.obtenerPorId);
router.post('/',      requireAdmin, productosController.crear);
router.put('/:id',    requireAdmin, productosController.actualizar);
router.delete('/:id', requireAdmin, productosController.eliminar);

export default router;
