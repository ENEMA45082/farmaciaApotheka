import { Router } from 'express';
import * as webhooksController from '../controllers/webhooks.controller';
import { validar } from '../middlewares/validar';
import { nuevoUsuarioWebhookSchema } from '../schemas/webhooks.schema';

const router = Router();

// Sin requiereAutenticacion: lo llama Supabase, no un usuario logueado.
// verificarSecreto va antes que validar: una request sin el secreto correcto
// no debe ni enterarse de qué shape espera el body.
router.post(
  '/nuevo-usuario',
  webhooksController.verificarSecreto,
  validar(nuevoUsuarioWebhookSchema),
  webhooksController.nuevoUsuario,
);

export default router;
