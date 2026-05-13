import type { Request, Response, NextFunction } from 'express';
import { ErrorServicio } from '../services/productos.service';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ErrorServicio) {
    res.status(err.statusCode).json({
      error:      err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  console.error(`[${req.method}] ${req.path}`, err);
  res.status(500).json({
    error:      'Error interno del servidor',
    statusCode: 500,
  });
}
