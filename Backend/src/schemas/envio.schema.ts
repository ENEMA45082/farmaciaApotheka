import { z } from 'zod';
import { CODIGOS_PROVINCIA_VALIDOS } from '../config/provincias';

export const cotizarEnvioSchema = z.object({
  items: z.array(z.object({
    peso_gramos: z.number().nonnegative().optional(),
    cantidad:    z.number().int().positive(),
  })).optional(),
  codigoPostal: z.string().min(1),
  metodo:       z.enum(['domicilio', 'retiro_sucursal']),
});

export const sucursalesQuerySchema = z.object({
  provinciaCodigo: z.enum(CODIGOS_PROVINCIA_VALIDOS as [string, ...string[]]),
});
