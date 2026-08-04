import { z } from 'zod';

// El frontend usa link_url como destino de un <Link> de react-router
// (HeroCarousel.tsx) — normalmente una ruta interna tipo "/ofertas", no una
// URL absoluta. z.url() solo aceptaba URLs con protocolo (https://...) y
// rechazaba toda ruta interna, incluida la que el propio formulario admin
// sugiere como placeholder.
const linkUrlSchema = z.string()
  .max(500)
  .refine(val => val.startsWith('/') || /^https?:\/\//i.test(val), {
    message: 'Debe ser una ruta interna (ej: /ofertas) o una URL completa (https://...)',
  });

export const crearBannerSchema = z.object({
  imagen_url: z.string().url().max(500),
  link_url:   linkUrlSchema.nullable().optional(),
  alt_texto:  z.string().min(1).max(300),
  orden:      z.number().int().optional(),
});

export const actualizarBannerSchema = z.object({
  imagen_url: z.string().url().max(500).optional(),
  link_url:   linkUrlSchema.nullable().optional(),
  alt_texto:  z.string().min(1).max(300).optional(),
  orden:      z.number().int().optional(),
  activo:     z.boolean().optional(),
});
