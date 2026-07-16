import type { Request, Response, NextFunction } from 'express';
import * as estadosService from '../services/estados.service';

export async function listar(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const estados = await estadosService.listar();
    res.json(estados);
  } catch (err) {
    next(err);
  }
}
