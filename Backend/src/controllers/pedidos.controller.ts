import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import * as pedidosService from '../services/pedidos.service';
import type { CrearPedidoDTO } from '../types';

type AuthRequest = Request & { user: User };

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const pedido = await pedidosService.crear(userId, req.body as CrearPedidoDTO);
    res.status(201).json(pedido);
  } catch (err) { next(err); }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const pedidos = await pedidosService.listar(userId);
    res.json(pedidos);
  } catch (err) { next(err); }
}

export async function obtenerPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const pedido = await pedidosService.obtenerPorId(req.params.id, userId);
    res.json(pedido);
  } catch (err) { next(err); }
}

export async function cancelar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const pedido = await pedidosService.cancelar(req.params.id, userId);
    res.json(pedido);
  } catch (err) { next(err); }
}

export async function listarAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pedidos = await pedidosService.listarTodos();
    res.json(pedidos);
  } catch (err) { next(err); }
}

export async function cambiarEstadoAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { estado } = req.body as { estado: string };
    const pedido = await pedidosService.cambiarEstado(req.params.id, estado as never);
    res.json(pedido);
  } catch (err) { next(err); }
}
