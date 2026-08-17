import type { Request, Response, NextFunction } from 'express';
import * as cuponesService from '../services/cupones.service';
import type { AuthRequest, CrearCuponDTO, ActualizarCuponDTO, ItemCarritoInput } from '../types';

export async function validar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const { codigo, itemsCarrito } = req.body as { codigo: string; itemsCarrito: ItemCarritoInput[] };
    const resultado = await cuponesService.validarCupon({ codigo, clienteId: userId, itemsCarrito });
    res.json(resultado);
  } catch (err) { next(err); }
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as CrearCuponDTO;
    const cupon = await cuponesService.crear(dto);
    res.status(201).json(cupon);
  } catch (err) { next(err); }
}

export async function listarAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cupones = await cuponesService.listarConUsos();
    res.json(cupones);
  } catch (err) { next(err); }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as ActualizarCuponDTO;
    const cupon = await cuponesService.actualizar(req.params.id, dto);
    res.json(cupon);
  } catch (err) { next(err); }
}
