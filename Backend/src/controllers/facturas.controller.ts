import type { Request, Response, NextFunction } from 'express';
import * as facturasService from '../services/facturas.service';

export async function listarConProblemas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const facturas = await facturasService.listarConProblemas();
    res.json(facturas);
  } catch (err) {
    next(err);
  }
}
