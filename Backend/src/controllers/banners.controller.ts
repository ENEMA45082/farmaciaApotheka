import type { Request, Response, NextFunction } from 'express';
import * as bannersService from '../services/banners.service';
import type { CrearBannerDTO, ActualizarBannerDTO } from '../types';

// Siempre solo activos: es el carrusel público de la home. No depende de si
// quien mira está logueado como admin en otra pestaña — banners.api.ts manda
// el token en todas las requests, así que antes esto se colaba como "modo
// admin" y mostraba banners inactivos en la home cuando un admin la visitaba.
export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const banners = await bannersService.listar(true);
    res.json(banners);
  } catch (err) {
    next(err);
  }
}

export async function listarAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const banners = await bannersService.listar(false);
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
