import { z } from 'zod';

const camposProducto = {
  nombre:            z.string().min(1),
  descripcion:       z.string().optional(),
  precio:            z.number().nonnegative(),
  en_oferta:         z.boolean().optional(),
  precio_oferta:     z.number().nonnegative().nullable().optional(),
  porcentaje_oferta: z.number().min(0).max(100).nullable().optional(),
  imagen_url:        z.string().optional(),
  categoria_id:      z.string().uuid().optional(),
  stock:             z.number().int().nonnegative().optional(),
  codigo_barras:     z.string().optional(),
  fecha_vencimiento: z.string().optional(),
  imagenes:          z.array(z.string()).optional(),
  es_venta_libre:    z.boolean().optional(),
  peso_gramos:       z.number().nonnegative().optional(),
  alicuota_iva:      z.number().nonnegative().optional(),
};

export const crearProductoSchema = z.object(camposProducto);

export const actualizarProductoSchema = crearProductoSchema.partial();

// GET /productos es público — se mantiene la misma tolerancia que parseNumero()
// (utils/parseNumero.ts): un filtro numérico con formato inválido se ignora en
// vez de rechazar la request completa.
const numeroOpcionalTolerante = z.coerce.number().optional().catch(undefined);
const booleanoDesdeQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform(v => (v === undefined ? undefined : v === 'true'));

export const filtrosProductoQuerySchema = z.object({
  categoria:         z.string().optional(),
  categorias:        z.string().optional(),
  busqueda:          z.string().optional(),
  codigo_barras:     z.string().optional(),
  en_oferta:         booleanoDesdeQuery,
  precio_min:        numeroOpcionalTolerante,
  precio_max:        numeroOpcionalTolerante,
  stock_min:         numeroOpcionalTolerante,
  stock_max:         numeroOpcionalTolerante,
  vencimiento_desde: z.string().optional(),
  vencimiento_hasta: z.string().optional(),
  pagina:            numeroOpcionalTolerante,
  limite:            numeroOpcionalTolerante,
  ordenar:           z.enum(['nombre_asc', 'nombre_desc', 'precio_asc', 'precio_desc']).optional(),
});

export const confirmarImportarPreciosSchema = z.object({
  items: z.array(z.object({
    codigo_barras: z.string().min(1),
    precio_nuevo:  z.number().nonnegative(),
    nombre:        z.string().optional(),
  })).max(500, 'Máximo 500 items por request'),
});
