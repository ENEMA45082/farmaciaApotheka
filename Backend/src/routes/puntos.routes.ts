import { Router } from 'express';
import * as puntosController from '../controllers/puntos.controller';
import { requiereAutenticacion, requiereAdmin } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import { limitadorCanjePuntos } from '../middlewares/limitadorSolicitudes';
import { crearPremioSchema, actualizarPremioSchema, canjearPremioSchema } from '../schemas/puntos.schema';

const router = Router();

router.get('/',         requiereAutenticacion, puntosController.obtenerMiSaldo);
router.get('/catalogo', requiereAutenticacion, puntosController.catalogo);
router.post('/canjear', requiereAutenticacion, limitadorCanjePuntos, validar(canjearPremioSchema), puntosController.canjear);

router.post('/premios',      requiereAdmin, validar(crearPremioSchema), puntosController.crearPremio);
router.get('/premios/admin', requiereAdmin, puntosController.listarPremiosAdmin);
router.patch('/premios/:id', requiereAdmin, validar(actualizarPremioSchema), puntosController.actualizarPremio);
router.get('/canjes/admin',  requiereAdmin, puntosController.listarCanjesAdmin);

export default router;
