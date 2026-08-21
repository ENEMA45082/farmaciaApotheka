import type { Request, Response, NextFunction } from 'express';
import * as bannersPromoService from '../services/bannersPromo.service';
import type { CrearBannerPromoDTO, ActualizarBannerPromoDTO } from '../types';

// Igual que banners.controller.ts: la home siempre pide solo activos, sin
// importar si quien mira tiene sesión de admin abierta en otra pestaña.
export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const banners = await bannersPromoService.listar(true);
    res.json(banners);
  } catch (err) {
    next(err);
  }
}

export async function listarAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const banners = await bannersPromoService.listar(false);
    res.json(banners);
  } catch (err) {
    next(err);
  }
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as CrearBannerPromoDTO;
    const banner = await bannersPromoService.crear(dto);
    res.status(201).json(banner);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as ActualizarBannerPromoDTO;
    const banner = await bannersPromoService.actualizar(req.params.id, dto);
    res.json(banner);
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await bannersPromoService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
