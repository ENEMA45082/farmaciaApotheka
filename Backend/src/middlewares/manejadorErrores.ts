import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function manejadorErrores(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    const cuerpo: Record<string, unknown> = {
      error:      error.message,
      statusCode: error.statusCode,
      code:       error.code,
    };
    if (error.details) cuerpo.details = error.details;
    res.status(error.statusCode).json(cuerpo);
    return;
  }

  console.error(`[${new Date().toISOString()}] [${req.method}] ${req.path}`, error);
  res.status(500).json({
    error:      'Error interno del servidor',
    statusCode: 500,
  });
}
