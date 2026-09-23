import { Router } from 'express';
import * as productosController from '../controllers/productos.controller';
import { requiereAdmin, autenticacionOpcional } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import {
  crearProductoSchema,
  actualizarProductoSchema,
  filtrosProductoQuerySchema,
  aplicarCambiosPrecioSchema,
} from '../schemas/productos.schema';

const router = Router();

router.post(
  '/preview-importar-precios',
  requiereAdmin,
  productosController.csvUploadMiddleware,
  productosController.previewImportarPrecios
);

router.post(
  '/aplicar-cambios-precio',
  requiereAdmin,
  validar(aplicarCambiosPrecioSchema),
  productosController.aplicarCambiosPrecio
);

router.get('/', autenticacionOpcional, validar(filtrosProductoQuerySchema, 'query'), productosController.listar);

router.get('/:id', autenticacionOpcional, productosController.obtenerPorId);

router.post('/', requiereAdmin, validar(crearProductoSchema), productosController.crear);

router.put('/:id', requiereAdmin, validar(actualizarProductoSchema), productosController.actualizar);

router.delete('/:id', requiereAdmin, productosController.eliminar);

export default router;
