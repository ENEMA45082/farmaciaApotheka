import { Router } from 'express';
import * as productosDestacadosController from '../controllers/productosDestacados.controller';
import { requiereAdmin } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import { crearProductoDestacadoSchema, actualizarProductoDestacadoSchema } from '../schemas/productosDestacados.schema';

const router = Router();

router.get('/', productosDestacadosController.listar);
router.post('/', requiereAdmin, validar(crearProductoDestacadoSchema), productosDestacadosController.agregar);
router.put('/:id', requiereAdmin, validar(actualizarProductoDestacadoSchema), productosDestacadosController.actualizar);
router.delete('/:id', requiereAdmin, productosDestacadosController.eliminar);

export default router;
