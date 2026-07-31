import { Router } from 'express';
import * as estadosController from '../controllers/estados.controller';

const router = Router();

router.get('/', estadosController.listar);

export default router;
