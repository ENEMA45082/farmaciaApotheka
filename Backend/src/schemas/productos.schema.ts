import { z } from 'zod';

const camposProducto = {
  nombre:            z.string().min(1).max(200),
  descripcion:       z.string().max(2000).optional(),
  precio:            z.number().nonnegative(),
  en_oferta:         z.boolean().optional(),
  precio_oferta:     z.number().nonnegative().nullable().optional(),
  porcentaje_oferta: z.number().min(0).max(100).nullable().optional(),
  es_2x1:            z.boolean().optional(),
  imagen_url:        z.string().max(2000).optional(),
  categoria_id:      z.string().uuid().optional(),
  stock:             z.number().int().nonnegative().optional(),
  codigo_barras:     z.string().max(64).optional(),
  fecha_vencimiento: z.string().optional(),
  imagenes:          z.array(z.string().max(2000)).max(20).optional(),
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
  categoria:         z.string().max(2000).optional(),
  categorias:        z.string().max(2000).optional(),
  busqueda:          z.string().max(200).optional(),
  codigo_barras:     z.string().max(64).optional(),
  en_oferta:         booleanoDesdeQuery,
  precio_min:        numeroOpcionalTolerante,
  precio_max:        numeroOpcionalTolerante,
  stock_min:         numeroOpcionalTolerante,
  stock_max:         numeroOpcionalTolerante,
  vencimiento_desde: z.string().optional(),
  vencimiento_hasta: z.string().optional(),
  pagina:            numeroOpcionalTolerante,
  // Con tope acá (no solo en el service) para que un límite fuera de rango
  // se ignore de entrada en vez de depender de que productos.service.ts lo recorte después.
  limite:            z.coerce.number().int().positive().max(50).optional().catch(undefined),
  ordenar:           z.enum(['nombre_asc', 'nombre_desc', 'precio_asc', 'precio_desc']).optional(),
});

export const confirmarImportarPreciosSchema = z.object({
  items: z.array(z.object({
    codigo_barras: z.string().min(1),
    precio_nuevo:  z.number().nonnegative(),
    nombre:        z.string().optional(),
  })).max(500, 'Máximo 500 items por request'),
});
