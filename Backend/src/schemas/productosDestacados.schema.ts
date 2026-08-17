import { z } from 'zod';

export const crearProductoDestacadoSchema = z.object({
  producto_id: z.string().uuid(),
});

export const actualizarProductoDestacadoSchema = z.object({
  orden: z.number().int(),
});
