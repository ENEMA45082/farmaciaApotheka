import type { Request, Response, NextFunction } from 'express';
import * as favoritosService from '../services/favoritos.service';

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as Request & { user: { id: string } }).user;
    const ids = await favoritosService.listar(user.id);
    res.json(ids);
  } catch (err) {
    next(err);
  }
}

export async function toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as Request & { user: { id: string } }).user;
    const { productoId } = req.params;
    const resultado = await favoritosService.toggle(user.id, productoId);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}
