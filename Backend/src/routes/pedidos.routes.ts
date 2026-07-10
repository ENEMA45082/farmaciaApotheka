import { Router } from 'express';
import * as pedidosController from '../controllers/pedidos.controller';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/admin',              requireAdmin, pedidosController.listarAdmin);
router.get('/admin/:id',          requireAdmin, pedidosController.obtenerPorIdAdmin);
router.patch('/:id/estado',       requireAdmin, pedidosController.cambiarEstadoAdmin);
router.patch('/:id/cancelar-admin', requireAdmin, pedidosController.cancelarPedidoAdmin);
router.post('/:id/reintentar-factura', requireAdmin, pedidosController.reintentarFactura);

router.post('/',              requireAuth,  pedidosController.crear);
router.get('/',               requireAuth,  pedidosController.listar);
router.get('/:id',            requireAuth,  pedidosController.obtenerPorId);
router.patch('/:id/cancelar', requireAuth,  pedidosController.cancelar);
router.get('/:id/tracking',   requireAuth,  pedidosController.tracking);

export default router;
