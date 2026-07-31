import { Router } from 'express';
import * as perfilController from '../controllers/perfil.controller';
import { requiereAutenticacion } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import { actualizarPerfilSchema } from '../schemas/perfil.schema';

const router = Router();

router.get('/', requiereAutenticacion, perfilController.obtener);
router.put('/', requiereAutenticacion, validar(actualizarPerfilSchema), perfilController.actualizar);

export default router;
