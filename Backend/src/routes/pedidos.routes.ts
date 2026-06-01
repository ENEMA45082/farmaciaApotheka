import { Router } from 'express';
import * as pedidosController from '../controllers/pedidos.controller';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/admin',          requireAdmin, pedidosController.listarAdmin);
router.patch('/:id/estado',   requireAdmin, pedidosController.cambiarEstadoAdmin);

router.post('/',              requireAuth,  pedidosController.crear);
router.get('/',               requireAuth,  pedidosController.listar);
router.get('/:id',            requireAuth,  pedidosController.obtenerPorId);
router.patch('/:id/cancelar', requireAuth,  pedidosController.cancelar);

export default router;
