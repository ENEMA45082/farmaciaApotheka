import { Router } from 'express';
import * as comboItemsController from '../controllers/comboItems.controller';
import { requiereAdmin } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import {
  crearComboItemSchema,
  actualizarComboItemSchema,
  listarComboItemsQuerySchema,
} from '../schemas/comboItems.schema';

const router = Router();

router.get('/', requiereAdmin, validar(listarComboItemsQuerySchema, 'query'), comboItemsController.listar);
router.post('/', requiereAdmin, validar(crearComboItemSchema), comboItemsController.agregar);
router.put('/:id', requiereAdmin, validar(actualizarComboItemSchema), comboItemsController.actualizar);
router.delete('/:id', requiereAdmin, comboItemsController.eliminar);

export default router;
