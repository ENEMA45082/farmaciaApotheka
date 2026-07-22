import { z } from 'zod';
import { ESTADOS_PEDIDO, MOTIVOS_CANCELACION } from '../config/estadosPedido';

const itemPedidoSchema = z.object({
  producto_id:     z.string().uuid(),
  nombre_producto: z.string().min(1),
  cantidad:        z.number().int().positive(),
  // Se aceptan en el shape porque el service los recalcula contra el catálogo
  // (ver pedidos.service.ts::crear) — acá solo se valida que tengan forma numérica.
  precio_unitario: z.number().nonnegative(),
  precio_lista:    z.number().nonnegative(),
});

export const crearPedidoSchema = z.object({
  items:        z.array(itemPedidoSchema).min(1, 'El pedido debe tener al menos un producto'),
  notas:        z.string().optional(),
  metodo_envio: z.enum(['retiro_farmacia', 'domicilio', 'retiro_sucursal']),
  costo_envio:  z.number().nonnegative(),
  sucursal_correo_argentino: z.string().optional(),
  codigo_postal_envio:       z.string().optional(),
  metodo_pago:               z.enum(['tarjeta', 'transferencia', 'efectivo']),
  destinatario_nombre:       z.string().optional(),
  destinatario_dni:          z.string().optional(),
  destinatario_cod_area:     z.string().optional(),
  destinatario_telefono:     z.string().optional(),
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
