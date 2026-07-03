import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error:      err.message,
      statusCode: err.statusCode,
    };
    if (err.code) body.code = err.code;
    res.status(err.statusCode).json(body);
    return;
  }

  console.error(`[${new Date().toISOString()}] [${req.method}] ${req.path}`, err);
  res.status(500).json({
    error:      'Error interno del servidor',
    statusCode: 500,
  });
}
