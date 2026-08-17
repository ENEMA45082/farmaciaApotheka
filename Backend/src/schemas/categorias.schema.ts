import { z } from 'zod';

export const crearCategoriaSchema = z.object({
  nombre:   z.string().min(1).max(200),
  id_padre: z.string().uuid().optional(),
});

export const actualizarCategoriaSchema = z.object({
  nombre:   z.string().min(1).max(200).optional(),
  id_padre: z.string().uuid().nullable().optional(),
});

// GET /categorias es público y lo consumen varios lugares que esperan el
// array plano completo (nav de la home, selector de categoría del alta de
// productos, árbol de categorías). El paginado es opt-in: solo se activa si
// se manda alguno de estos params — sin ellos, la respuesta no cambia.
export const filtrosCategoriaQuerySchema = z.object({
  busqueda: z.string().max(200).optional(),
  pagina:   z.coerce.number().int().positive().optional().catch(undefined),
  limite:   z.coerce.number().int().positive().max(50).optional().catch(undefined),
});
