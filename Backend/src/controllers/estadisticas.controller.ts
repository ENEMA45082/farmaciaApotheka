import { Request, Response, NextFunction } from 'express';
import * as estadisticasService from '../services/estadisticas.service';

export async function obtenerEstadisticas(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = await estadisticasService.obtenerEstadisticas();
    res.json(datos);
  } catch (err) {
    next(err);
  }
}
