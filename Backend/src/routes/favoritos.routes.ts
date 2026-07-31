import { Router } from 'express';
import { requiereAutenticacion } from '../middlewares/autenticacion.middleware';
import * as favoritosController from '../controllers/favoritos.controller';

const router = Router();

router.use(requiereAutenticacion);

router.get('/',                   favoritosController.listar);

router.post('/:productoId',       favoritosController.toggle);

export default router;
