import { z } from 'zod';
import { CODIGOS_PROVINCIA_VALIDOS } from '../config/provincias';

export const guardarDireccionSchema = z.object({
  calle:            z.string().min(1),
  altura:           z.string().min(1),
  piso:             z.string().nullable().optional(),
  depto:            z.string().nullable().optional(),
  ciudad:           z.string().min(1),
  provincia:        z.string().min(1),
  provincia_codigo: z.enum(CODIGOS_PROVINCIA_VALIDOS as [string, ...string[]]),
  pais:             z.string().optional(),
  codigo_postal:    z.string().nullable().optional(),
  lat:              z.number().nullable().optional(),
  lng:              z.number().nullable().optional(),
});
