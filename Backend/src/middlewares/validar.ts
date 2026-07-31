import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors/AppError';

export function validar(esquema: ZodType, origen: 'body' | 'query' = 'body'): RequestHandler {
  return (req, _res, next) => {
    const resultado = esquema.safeParse(req[origen]);
    if (!resultado.success) {
      const detalles = resultado.error.issues.map(i => ({
        path:    i.path.join('.') || origen,
        message: i.message,
      }));
      const mensaje = detalles.map(d => `${d.path}: ${d.message}`).join('; ');
      next(new AppError(`Datos inválidos: ${mensaje}`, 400, 'VALIDATION_ERROR', detalles));
      return;
    }
    req[origen] = resultado.data as never;
    next();
  };
}
