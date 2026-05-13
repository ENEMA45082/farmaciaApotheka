import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase';

const BUCKET = 'Farmacia-Apotheka';
const MAX_SIZE_MB = 5;
const MAX_FILES = 5;

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten imágenes'));
    } else {
      cb(null, true);
    }
  },
}).array('imagenes', MAX_FILES);

export async function subirImagenes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No se recibió ninguna imagen' });
      return;
    }

    const urls = await Promise.all(
      files.map(async file => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
        const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(nombre, file.buffer, { contentType: file.mimetype, upsert: false });

        if (error) throw error;

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombre);
        return data.publicUrl;
      })
    );

    res.status(201).json({ urls });
  } catch (err) {
    next(err);
  }
}
