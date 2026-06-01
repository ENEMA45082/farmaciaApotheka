import { Router } from 'express';
import * as categoriasController from '../controllers/categorias.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/',        categoriasController.listar);
router.get('/arbol',   categoriasController.obtenerArbol);
router.get('/:id',     categoriasController.obtenerPorId);
router.post('/',      requireAdmin, categoriasController.crear);
router.put('/:id',    requireAdmin, categoriasController.actualizar);
router.delete('/:id', requireAdmin, categoriasController.eliminar);

export default router;
