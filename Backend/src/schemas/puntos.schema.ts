import { z } from 'zod';

export const crearPremioSchema = z.object({
  nombre:       z.string().min(1).max(200),
  descripcion:  z.string().max(1000).nullable().optional(),
  imagen_url:   z.string().url().max(500).nullable().optional(),
  costo_puntos: z.number().int().positive(),
  stock:        z.number().int().nonnegative().nullable().optional(),
  activo:       z.boolean().optional(),
});

export const actualizarPremioSchema = z.object({
  nombre:       z.string().min(1).max(200).optional(),
  descripcion:  z.string().max(1000).nullable().optional(),
  imagen_url:   z.string().url().max(500).nullable().optional(),
  costo_puntos: z.number().int().positive().optional(),
  stock:        z.number().int().nonnegative().nullable().optional(),
  activo:       z.boolean().optional(),
});

export const canjearPremioSchema = z.object({
  premio_id: z.string().uuid(),
});
