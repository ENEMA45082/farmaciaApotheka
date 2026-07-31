import { Router } from 'express';
import { uploadMiddleware, subirImagenes } from '../controllers/uploads.controller';
import { requiereAdmin } from '../middlewares/autenticacion.middleware';

const router = Router();

router.post('/', requiereAdmin, uploadMiddleware, subirImagenes);

export default router;
