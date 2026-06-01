import { Router } from 'express';
import * as perfilController from '../controllers/perfil.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, perfilController.obtener);
router.put('/', requireAuth, perfilController.actualizar);

export default router;
