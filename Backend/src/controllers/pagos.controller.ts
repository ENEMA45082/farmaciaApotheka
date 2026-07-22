import { Request, Response, NextFunction } from 'express';
import * as perfilRepo      from '../repositories/perfil.repository';
import * as direccionesRepo from '../repositories/direcciones.repository';
import * as pagosService    from '../services/pagos.service';
import * as pedidosService  from '../services/pedidos.service';
import { AppError }         from '../errors/AppError';
import type { AuthRequest } from '../types';

export async function pagar(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as AuthRequest;
    // req.body ya viene validado por validate(pagarSchema)
    const { pedidoId, token, bin, cuotas, paymentMethodId } = req.body as {
      pedidoId: string;
      token: string;
      bin: string;
      cuotas?: number;
      paymentMethodId?: number;
    };

    // obtenerPorId ya verifica 404 y ownership (403)
    const pedido = await pedidosService.obtenerPorId(pedidoId, user.id);

    if (pedido.estado !== 'PendienteDePago') {
      throw new AppError('El pedido no está en estado pendiente de pago', 400);
    }

    const [perfil, direccion] = await Promise.all([
      perfilRepo.encontrarOCrear(user.id),
      direccionesRepo.obtener(user.id),
    ]);

    const resultado = await pagosService.procesarPago(
      pedido,
      token,
      bin,
      cuotas ?? 1,
      paymentMethodId ?? 1,
      {
        email:        user.email ?? '',
        nombre:       perfil.nombre   ?? 'Cliente',
        apellido:     perfil.apellido ?? '',
        telefono:     perfil.telefono ?? '',
        street1:      direccion ? `${direccion.calle} ${direccion.altura}` : 'Sin dirección',
        ciudad:       direccion?.ciudad        ?? 'Buenos Aires',
        provincia:    direccion?.provincia     ?? 'Buenos Aires',
        codigoPostal: direccion?.codigo_postal ?? '1000',
        userId:       user.id,
      },
    );

    if (resultado.status === 'approved') {
      res.json({ success: true, pedidoId, pw_payment_id: resultado.pw_payment_id });
    } else {
      res.status(402).json({ success: false, error: 'Pago rechazado por la entidad' });
    }
  } catch (err) {
    next(err);
  }
}

export async function checkout(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as AuthRequest;
    // req.body ya viene validado por validate(checkoutSchema)
    const { pedidoId } = req.body as { pedidoId: string };

    // obtenerPorId ya verifica 404 y ownership (403)
    const pedido = await pedidosService.obtenerPorId(pedidoId, user.id);

    if (pedido.estado !== 'PendienteDePago') {
      throw new AppError('El pedido no está en estado pendiente de pago', 400);
    }

    const items = (pedido.detalles ?? []).map(d => ({
      nombre:   d.nombre_producto,
      precio:   d.precio_unitario,
      cantidad: d.cantidad,
    }));

    const checkoutUrl = await pagosService.generarCheckoutHosted(pedido, items);
    res.json({ checkoutUrl });
  } catch (err) {
    next(err);
  }
}

export async function verificarEstado(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = req as AuthRequest;
    const { pedidoId } = req.params as { pedidoId: string };

    // obtenerPorId ya verifica 404 y ownership (403)
    const pedido = await pedidosService.obtenerPorId(pedidoId, user.id);
    const actualizado = await pagosService.verificarEstadoPago(pedido);
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
}

export async function notificacion(req: Request, res: Response) {
  const secretEsperado = process.env.PAYWAY_WEBHOOK_SECRET;
  if (secretEsperado && req.query.secret !== secretEsperado) {
    console.error('[Payway Notificacion] secreto inválido o ausente — posible intento de forjado. IP:', req.ip);
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  console.log('[Payway Notificacion] body recibido:', JSON.stringify(req.body));
  try {
    await pagosService.procesarNotificacion(req.body as Record<string, unknown>);
  } catch (err) {
    console.error('[Payway Notificacion] Error procesando:', err);
  }
  // Siempre responder 200 a Payway para evitar reintentos en loop
  res.status(200).json({ ok: true });
}
