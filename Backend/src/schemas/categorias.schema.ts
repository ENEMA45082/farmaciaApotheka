import { z } from 'zod';

export const crearCategoriaSchema = z.object({
  nombre:   z.string().min(1),
  id_padre: z.string().uuid().optional(),
});

export const actualizarCategoriaSchema = z.object({
  nombre:   z.string().min(1).optional(),
  id_padre: z.string().uuid().nullable().optional(),
});
