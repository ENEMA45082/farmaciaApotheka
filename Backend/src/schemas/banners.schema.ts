import { z } from 'zod';

export const crearBannerSchema = z.object({
  imagen_url: z.string().url().max(500),
  link_url:   z.string().url().max(500).nullable().optional(),
  alt_texto:  z.string().min(1).max(300),
  orden:      z.number().int().optional(),
});

export const actualizarBannerSchema = z.object({
  imagen_url: z.string().url().max(500).optional(),
  link_url:   z.string().url().max(500).nullable().optional(),
  alt_texto:  z.string().min(1).max(300).optional(),
  orden:      z.number().int().optional(),
  activo:     z.boolean().optional(),
});
