import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors/AppError';

export function validate(schema: ZodType, source: 'body' | 'query' = 'body'): RequestHandler {
  return (req, _res, next) => {
    const resultado = schema.safeParse(req[source]);
    if (!resultado.success) {
      const mensaje = resultado.error.issues
        .map(i => `${i.path.join('.') || source}: ${i.message}`)
        .join('; ');
      next(new AppError(`Datos inválidos: ${mensaje}`, 400));
      return;
    }
    req[source] = resultado.data as never;
    next();
  };
}
