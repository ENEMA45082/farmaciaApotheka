import type { Request, Response, NextFunction } from 'express';
import * as comboItemsService from '../services/comboItems.service';
import type { CrearComboItemDTO, ActualizarComboItemDTO } from '../types';

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { combo_id } = req.query as { combo_id: string };
    const items = await comboItemsService.listarPorCombo(combo_id);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

export async function agregar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as CrearComboItemDTO;
    const item = await comboItemsService.agregar(dto);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as ActualizarComboItemDTO;
    const item = await comboItemsService.actualizarCantidad(req.params.id, dto);
    res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await comboItemsService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
