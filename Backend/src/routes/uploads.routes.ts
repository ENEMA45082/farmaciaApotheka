import { Router } from 'express';
import { uploadMiddleware, subirImagenes } from '../controllers/uploads.controller';

const router = Router();

router.post('/', uploadMiddleware, subirImagenes);

export default router;
