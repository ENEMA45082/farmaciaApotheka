import type { Request, Response, NextFunction } from 'express';
import * as bannersService from '../services/banners.service';
import type { CrearBannerDTO, ActualizarBannerDTO, AuthRequest } from '../types';

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const modoAdmin = (req as AuthRequest).user?.app_metadata?.role === 'admin';
    const banners = await bannersService.listar(!modoAdmin);
    res.json(banners);
  } catch (err) {
    next(err);
  }
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as CrearBannerDTO;
    const banner = await bannersService.crear(dto);
    res.status(201).json(banner);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as ActualizarBannerDTO;
    const banner = await bannersService.actualizar(req.params.id, dto);
    res.json(banner);
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await bannersService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
