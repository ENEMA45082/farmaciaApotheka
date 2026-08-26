import { z } from 'zod';
import { ESTADOS_PEDIDO, MOTIVOS_CANCELACION } from '../config/estadosPedido';
import { esCantidadCuotasValida } from '../config/cuotas';

const itemPedidoSchema = z.object({
  producto_id:     z.string().uuid(),
  nombre_producto: z.string().min(1).max(200),
  cantidad:        z.number().int().positive(),
  // Se aceptan en el shape porque el service los recalcula contra el catálogo
  // (ver pedidos.service.ts::crear) — acá solo se valida que tengan forma numérica.
  precio_unitario: z.number().nonnegative(),
  precio_lista:    z.number().nonnegative(),
});

// Subconjunto de itemPedidoSchema con lo único que realmente se usa para
// resolver precios (producto_id + cantidad) — lo reutiliza cupones.schema.ts
// para no repetir el shape.
export const itemCarritoInputSchema = itemPedidoSchema.pick({ producto_id: true, cantidad: true });

export const crearPedidoSchema = z.object({
  // Tope para que un pedido con miles de items no dispare la misma cantidad
  // de consultas secuenciales a la base en pedidos.service.ts::crear.
  items:        z.array(itemPedidoSchema).min(1, 'El pedido debe tener al menos un producto').max(100),
  notas:        z.string().max(500).optional(),
  // 'retiro_sucursal' deshabilitado temporalmente (ver envio.schema.ts):
  // el scraping de cotización solo cubre "Entrega en Domicilio".
  metodo_envio: z.enum(['retiro_farmacia', 'domicilio']),
  costo_envio:  z.number().nonnegative(),
  tipo_servicio_envio: z.enum(['PAQ_AR_HOY', 'PAQ_AR_EXPRESO', 'PAQ_AR_CLASICO']).optional(),
  sucursal_correo_argentino: z.string().max(100).optional(),
  codigo_postal_envio:       z.string().max(20).optional(),
  metodo_pago:               z.enum(['tarjeta', 'transferencia', 'efectivo']),
  destinatario_nombre:       z.string().max(200).optional(),
  destinatario_dni:          z.string().max(20).optional(),
  destinatario_cod_area:     z.string().max(10).optional(),
  destinatario_telefono:     z.string().max(30).optional(),
  codigo_cupon:              z.string().min(1).max(50).optional(),
  cuotas:                    z.number().int().refine(esCantidadCuotasValida, 'Cantidad de cuotas inválida').optional(),
});

export const cambiarEstadoSchema = z.object({
  estado: z.enum(ESTADOS_PEDIDO as [string, ...string[]]),
});

export const cancelarPedidoAdminSchema = z.object({
  motivo: z.enum(MOTIVOS_CANCELACION),
});

export const listarPedidosAdminQuerySchema = z.object({
  pagina: z.coerce.number().int().positive().optional(),
  limite: z.coerce.number().int().positive().optional(),
});
