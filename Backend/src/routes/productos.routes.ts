import { Router } from 'express';
import * as productosController from '../controllers/productos.controller';

const router = Router();

router.get('/',     productosController.listar);
router.get('/:id',  productosController.obtenerPorId);
router.post('/',    productosController.crear);
router.put('/:id',  productosController.actualizar);
router.delete('/:id', productosController.eliminar);

export default router;
