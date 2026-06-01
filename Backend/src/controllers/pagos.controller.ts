import { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import * as pedidosRepo     from '../repositories/pedidos.repository';
import * as perfilRepo      from '../repositories/perfil.repository';
import * as direccionesRepo from '../repositories/direcciones.repository';
import * as pagosService    from '../services/pagos.service';
import { ErrorServicio }    from '../services/productos.service';

type AuthReq = Request & { user: User };

export async function pagar(req: Request, res: Response, next: NextFunction) {
  try {
    const userId    = (req as AuthReq).user.id;
    const userEmail = (req as AuthReq).user.email ?? '';

    const { pedidoId, token, bin, cuotas, paymentMethodId } = req.body as {
      pedidoId: string;
      token: string;
      bin: string;
      cuotas: number;
      paymentMethodId: number;
    };

    if (!pedidoId || !token || !bin) {
      res.status(400).json({ error: 'pedidoId, token y bin son requeridos' });
      return;
    }

    const pedido = await pedidosRepo.encontrarPorId(pedidoId);
    if (!pedido) throw new ErrorServicio('Pedido no encontrado', 404);
    if (pedido.user_id !== userId) throw new ErrorServicio('Acceso denegado', 403);
    if (pedido.estado !== 'pendiente') {
      res.status(400).json({ error: 'El pedido no está en estado pendiente' });
      return;
    }

    // Obtener perfil y dirección del usuario para Cybersource
    const [perfil, direccion] = await Promise.all([
      perfilRepo.encontrarOCrear(userId),
      direccionesRepo.obtener(userId),
    ]);

    const resultado = await pagosService.procesarPago(
      pedido,
      token,
      bin,
      cuotas ?? 1,
      paymentMethodId ?? 1,
      {
        email:        userEmail,
        nombre:       perfil.nombre   ?? 'Cliente',
        apellido:     perfil.apellido ?? '',
        telefono:     perfil.telefono ?? '',
        street1:      direccion?.calle_numero  ?? 'Sin dirección',
        ciudad:       direccion?.ciudad        ?? 'Buenos Aires',
        provincia:    direccion?.provincia     ?? 'Buenos Aires',
        codigoPostal: direccion?.codigo_postal ?? '1000',
        userId,
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
    const userId  = (req as AuthReq).user.id;
    const { pedidoId } = req.body as { pedidoId: string };

    if (!pedidoId) {
      res.status(400).json({ error: 'pedidoId es requerido' });
      return;
    }

    const pedido = await pedidosRepo.encontrarPorId(pedidoId);
    if (!pedido) throw new ErrorServicio('Pedido no encontrado', 404);
    if (pedido.user_id !== userId) throw new ErrorServicio('Acceso denegado', 403);
    if (pedido.estado !== 'pendiente') {
      res.status(400).json({ error: 'El pedido no está en estado pendiente' });
      return;
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

export async function notificacion(req: Request, res: Response) {
  console.log('[Payway Notificacion] headers:', JSON.stringify(req.headers));
  console.log('[Payway Notificacion] body:', JSON.stringify(req.body));
  res.status(200).json({ ok: true });
}
