import { z } from 'zod';

// Mismo criterio que banners.schema.ts: el link puede ser una ruta interna
// (ej: /categoria/skincare) o una URL completa.
const linkUrlSchema = z.string()
  .max(500)
  .refine(val => val.startsWith('/') || /^https?:\/\//i.test(val), {
    message: 'Debe ser una ruta interna (ej: /categoria/skincare) o una URL completa (https://...)',
  });

const temaSchema = z.enum(['turquesa', 'azul', 'coral', 'violeta', 'verde']);

export const crearBannerPromoSchema = z.object({
  imagen_url:     z.string().url().max(500),
  titulo:         z.string().min(1).max(100),
  vigencia_texto: z.string().max(100).nullable().optional(),
  badge_texto:    z.string().max(50).nullable().optional(),
  tema:           temaSchema.optional(),
  link_url:       linkUrlSchema.nullable().optional(),
  orden:          z.number().int().optional(),
});

export const actualizarBannerPromoSchema = z.object({
  imagen_url:     z.string().url().max(500).optional(),
  titulo:         z.string().min(1).max(100).optional(),
  vigencia_texto: z.string().max(100).nullable().optional(),
  badge_texto:    z.string().max(50).nullable().optional(),
  tema:           temaSchema.optional(),
  link_url:       linkUrlSchema.nullable().optional(),
  orden:          z.number().int().optional(),
  activo:         z.boolean().optional(),
});
