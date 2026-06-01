import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as favoritosController from '../controllers/favoritos.controller';

const router = Router();

router.use(requireAuth);
router.get('/',                   favoritosController.listar);
router.post('/:productoId',       favoritosController.toggle);

export default router;
