import { Router } from 'express';
import { uploadMiddleware, subirImagenes } from '../controllers/uploads.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', requireAdmin, uploadMiddleware, subirImagenes);

export default router;
