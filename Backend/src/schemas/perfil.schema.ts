import { z } from 'zod';

export const actualizarPerfilSchema = z.object({
  nombre:           z.string().optional(),
  apellido:         z.string().optional(),
  dni:              z.string().optional(),
  documento_tipo:   z.enum(['DNI', 'CUIT']).optional(),
  genero:           z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  telefono:         z.string().optional(),
  foto_url:         z.string().optional(),
});
