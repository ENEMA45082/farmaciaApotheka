import type { Request, Response, NextFunction } from 'express';
import * as pedidosService from '../services/pedidos.service';
import type { AuthRequest, CrearPedidoDTO } from '../types';

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

export async function tracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const resultado = await pedidosService.obtenerTracking(req.params.id, userId);
    res.json(resultado);
  } catch (err) { next(err); }
}

export async function listarAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagina = parseInt(String(req.query.pagina ?? '1'), 10);
    const limite = parseInt(String(req.query.limite ?? '20'), 10);
    const resultado = await pedidosService.listarTodos(pagina, limite);
    res.json(resultado);
  } catch (err) { next(err); }
}

export async function cambiarEstadoAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { estado } = req.body as { estado: string };
    const pedido = await pedidosService.cambiarEstado(req.params.id, estado as never);
    res.json(pedido);
  } catch (err) { next(err); }
}
