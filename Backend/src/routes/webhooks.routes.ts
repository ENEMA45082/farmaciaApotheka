import { Router } from 'express';
import * as webhooksController from '../controllers/webhooks.controller';
import { validar } from '../middlewares/validar';
import { nuevoUsuarioWebhookSchema } from '../schemas/webhooks.schema';

const router = Router();

// Sin requiereAutenticacion: lo llama Supabase, no un usuario logueado.
// La verificación es el ?secret= (ver webhooks.controller.ts).
router.post('/nuevo-usuario', validar(nuevoUsuarioWebhookSchema), webhooksController.nuevoUsuario);

export default router;
