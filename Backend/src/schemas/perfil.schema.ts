import { z } from 'zod';

export const actualizarPerfilSchema = z.object({
  nombre:           z.string().max(200).optional(),
  apellido:         z.string().max(200).optional(),
  dni:              z.string().max(20).optional(),
  documento_tipo:   z.enum(['DNI', 'CUIT']).optional(),
  genero:           z.string().max(50).optional(),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: AAAA-MM-DD').optional(),
  telefono:         z.string().max(30).optional(),
  foto_url:         z.string().url().max(500).optional(),
});
