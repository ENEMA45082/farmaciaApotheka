import { z } from 'zod';

export const crearComboItemSchema = z.object({
  combo_id:    z.string().uuid(),
  producto_id: z.string().uuid(),
  cantidad:    z.number().int().positive(),
});

export const actualizarComboItemSchema = z.object({
  cantidad: z.number().int().positive(),
});

export const listarComboItemsQuerySchema = z.object({
  combo_id: z.string().uuid(),
});
