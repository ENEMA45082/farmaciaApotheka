import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';

const BUCKET = 'Farmacia-Apotheka';
const MAX_SIZE_MB = 5;
const MAX_FILES = 5;

// Whitelist explícita en vez de `startsWith('image/')`: ese chequeo dejaba pasar
// image/svg+xml, que puede llevar <script> embebido — al servirse después desde la
// URL pública de Supabase Storage, corre en ese origen si alguien la abre directo.
// Los formatos acá no pueden llevar script embebido.
const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const uploadImagenes = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!MIME_PERMITIDOS.has(file.mimetype)) {
      cb(new AppError('Solo se permiten imágenes JPG, PNG, WEBP o GIF', 400, 'ARCHIVO_TIPO_INVALIDO'));
    } else {
      cb(null, true);
    }
  },
}).array('imagenes', MAX_FILES);

// multer no tira AppError por su cuenta (fileFilter/límites devuelven un
// Error/MulterError genérico) — sin este wrapper, subir un archivo inválido,
// muy grande, o de más, caía en la rama genérica de manejadorErrores como
// "Error interno del servidor" en vez de un mensaje claro.
export function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  uploadImagenes(req, res, (error: unknown) => {
    if (!error) { next(); return; }
    if (error instanceof AppError) { next(error); return; }
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(`Cada imagen debe pesar como máximo ${MAX_SIZE_MB}MB`, 400, 'ARCHIVO_DEMASIADO_GRANDE'));
        return;
      }
      if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
        next(new AppError(`Se pueden subir como máximo ${MAX_FILES} imágenes por vez`, 400, 'DEMASIADOS_ARCHIVOS'));
        return;
      }
    }
    next(error);
  });
}

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
