import { z } from 'zod';

export const crearBannerSchema = z.object({
  imagen_url: z.string().min(1),
  link_url:   z.string().nullable().optional(),
  alt_texto:  z.string().min(1),
  orden:      z.number().int().optional(),
});

export const actualizarBannerSchema = z.object({
  imagen_url: z.string().min(1).optional(),
  link_url:   z.string().nullable().optional(),
  alt_texto:  z.string().min(1).optional(),
  orden:      z.number().int().optional(),
  activo:     z.boolean().optional(),
});
