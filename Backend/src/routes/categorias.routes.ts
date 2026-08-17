import { Router } from 'express';
import * as categoriasController from '../controllers/categorias.controller';
import { requiereAdmin } from '../middlewares/autenticacion.middleware';
import { validar } from '../middlewares/validar';
import { crearCategoriaSchema, actualizarCategoriaSchema, filtrosCategoriaQuerySchema } from '../schemas/categorias.schema';

const router = Router();

router.get('/',        validar(filtrosCategoriaQuerySchema, 'query'), categoriasController.listar);

router.get('/arbol',   categoriasController.obtenerArbol);

router.get('/:id',     categoriasController.obtenerPorId);
router.post('/',      requiereAdmin, validar(crearCategoriaSchema), categoriasController.crear);
router.put('/:id',    requiereAdmin, validar(actualizarCategoriaSchema), categoriasController.actualizar);
router.delete('/:id', requiereAdmin, categoriasController.eliminar);

export default router;
