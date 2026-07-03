import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as productosService from '../services/productos.service';
import { parseNumero } from '../utils/parseNumero';
import type { CrearProductoDTO, ActualizarProductoDTO, FiltrosProducto, ItemConfirmarPrecio, AuthRequest } from '../types';

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const modoAdmin = (req as AuthRequest).user?.app_metadata?.role === 'admin';

    const filtros: FiltrosProducto = {
      adminMode:         modoAdmin,
      categoria:         req.query.categoria         as string | undefined,
      busqueda:          req.query.busqueda          as string | undefined,
      codigo_barras:     req.query.codigo_barras     as string | undefined,
      en_oferta:         req.query.en_oferta === 'true' ? true : req.query.en_oferta === 'false' ? false : undefined,
      precio_min:        parseNumero(req.query.precio_min),
      precio_max:        parseNumero(req.query.precio_max),
      stock_min:         parseNumero(req.query.stock_min),
      stock_max:         parseNumero(req.query.stock_max),
      vencimiento_desde: req.query.vencimiento_desde as string | undefined,
      vencimiento_hasta: req.query.vencimiento_hasta as string | undefined,
      pagina:            parseNumero(req.query.pagina),
      limite:            parseNumero(req.query.limite),
      ordenar:           req.query.ordenar as FiltrosProducto['ordenar'] | undefined,
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

export const csvUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, archivo, cb) => {
    const esValido =
      archivo.mimetype === 'text/csv' ||
      archivo.mimetype === 'text/plain' ||
      archivo.mimetype === 'application/octet-stream';
    if (esValido) cb(null, true);
    else cb(new Error('Solo se permiten archivos CSV'));
  },
}).single('archivo');

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
