import { Router } from 'express';
import * as pedidosController from '../controllers/pedidos.controller';
import { requiereAutenticacion, requiereAdmin } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import {
  crearPedidoSchema,
  cambiarEstadoSchema,
  cancelarPedidoAdminSchema,
  listarPedidosAdminQuerySchema,
} from '../schemas/pedidos.schema';

const router = Router();

router.get('/admin',              requiereAdmin, validar(listarPedidosAdminQuerySchema, 'query'), pedidosController.listarAdmin);

router.get('/admin/:id',          requiereAdmin, pedidosController.obtenerPorIdAdmin);

router.patch('/:id/estado',       requiereAdmin, validar(cambiarEstadoSchema), pedidosController.cambiarEstadoAdmin);

router.patch('/:id/cancelar-admin', requiereAdmin, validar(cancelarPedidoAdminSchema), pedidosController.cancelarPedidoAdmin);

router.post('/:id/reintentar-factura', requiereAdmin, pedidosController.reintentarFactura);

router.post('/',              requiereAutenticacion,  validar(crearPedidoSchema), pedidosController.crear);
router.get('/',               requiereAutenticacion,  pedidosController.listar);

router.get('/:id',            requiereAutenticacion,  pedidosController.obtenerPorId);

router.patch('/:id/cancelar', requiereAutenticacion,  pedidosController.cancelar);

router.get('/:id/tracking',   requiereAutenticacion,  pedidosController.tracking);

export default router;
