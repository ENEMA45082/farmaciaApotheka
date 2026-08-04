import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as productosService from '../services/productos.service';
import { AppError } from '../errors/AppError';
import type { CrearProductoDTO, ActualizarProductoDTO, FiltrosProducto, ItemConfirmarPrecio, AuthRequest } from '../types';

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const modoAdmin = (req as AuthRequest).user?.app_metadata?.role === 'admin';

    // req.query ya viene validado y coercionado por validate(filtrosProductoQuerySchema)
    const filtros: FiltrosProducto = {
      ...(req.query as unknown as FiltrosProducto),
      adminMode: modoAdmin,
    };

    const resultado = await productosService.listar(filtros);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const producto = await productosService.obtenerPorId(req.params.id);
    res.json(producto);
  } catch (err) {
    next(err);
  }
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const datos = req.body as CrearProductoDTO;
    const producto = await productosService.crear(datos);
    res.status(201).json(producto);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const datos = req.body as ActualizarProductoDTO;
    const producto = await productosService.actualizar(req.params.id, datos);
    res.json(producto);
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await productosService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- Importación de precios por CSV ---

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, archivo, cb) => {
    const esValido =
      archivo.mimetype === 'text/csv' ||
      archivo.mimetype === 'text/plain' ||
      archivo.mimetype === 'application/octet-stream';
    if (esValido) cb(null, true);
    else cb(new AppError('Solo se permiten archivos CSV', 400, 'ARCHIVO_TIPO_INVALIDO'));
  },
}).single('archivo');

// multer no tira AppError por su cuenta (fileFilter/límite de tamaño devuelven un
// Error/MulterError genérico) — sin este wrapper, subir un archivo inválido o muy
// grande caía en la rama genérica de manejadorErrores como "Error interno del
// servidor" en vez de un mensaje claro.
export function csvUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  uploadCsv(req, res, (error: unknown) => {
    if (!error) { next(); return; }
    if (error instanceof AppError) { next(error); return; }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('El archivo supera el tamaño máximo permitido (10MB)', 400, 'ARCHIVO_DEMASIADO_GRANDE'));
      return;
    }
    next(error);
  });
}

export async function previewImportarPrecios(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const archivo = req.file;
    if (!archivo) {
      res.status(400).json({ error: 'No se recibió ningún archivo' });
      return;
    }
    const vista = await productosService.previewImportarPrecios(archivo.buffer);
    res.json(vista);
  } catch (err) {
    next(err);
  }
}

export async function confirmarImportarPrecios(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { items } = req.body as { items: ItemConfirmarPrecio[] };
    const resultado = await productosService.confirmarImportarPrecios(items ?? []);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}
