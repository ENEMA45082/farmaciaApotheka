import { Router } from 'express';
import { requiereAutenticacion } from '../middlewares/autenticacion.middleware';
import * as envioController from '../controllers/envio.controller';
import { validar } from '../middlewares/validar';
import { cotizarEnvioSchema, sucursalesQuerySchema } from '../schemas/envio.schema';

const router = Router();

router.post('/cotizar',   requiereAutenticacion, validar(cotizarEnvioSchema), envioController.cotizar);

router.get('/sucursales', requiereAutenticacion, validar(sucursalesQuerySchema, 'query'), envioController.sucursales);

export default router;
