import { z } from 'zod';
import { itemCarritoInputSchema } from './pedidos.schema';

const codigoSchema = z.string().trim().min(1).max(50);

export const crearCuponSchema = z.object({
  codigo:                  codigoSchema,
  tipo:                    z.enum(['porcentaje', 'fijo']),
  valor:                   z.number().positive(),
  compra_minima:           z.number().nonnegative().optional(),
  descuento_maximo:        z.number().positive().nullable().optional(),
  limite_usos_total:       z.number().int().positive().nullable().optional(),
  limite_usos_por_cliente: z.number().int().positive().nullable().optional(),
  valido_desde:            z.string().nullable().optional(),
  valido_hasta:            z.string().nullable().optional(),
  activo:                  z.boolean().optional(),
});

export const actualizarCuponSchema = z.object({
  tipo:                    z.enum(['porcentaje', 'fijo']).optional(),
  valor:                   z.number().positive().optional(),
  compra_minima:           z.number().nonnegative().optional(),
  descuento_maximo:        z.number().positive().nullable().optional(),
  limite_usos_total:       z.number().int().positive().nullable().optional(),
  limite_usos_por_cliente: z.number().int().positive().nullable().optional(),
  valido_desde:            z.string().nullable().optional(),
  valido_hasta:            z.string().nullable().optional(),
  activo:                  z.boolean().optional(),
});

export const validarCuponSchema = z.object({
  codigo:       codigoSchema,
  itemsCarrito: z.array(itemCarritoInputSchema).min(1, 'El carrito debe tener al menos un producto').max(100),
});
