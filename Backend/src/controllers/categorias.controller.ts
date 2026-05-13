import type { Request, Response, NextFunction } from 'express';
import * as categoriasService from '../services/categorias.service';
import type { CrearCategoriaDTO, ActualizarCategoriaDTO } from '../types';

export async function listar(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categorias = await categoriasService.listar();
    res.json(categorias);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categoria = await categoriasService.obtenerPorId(req.params.id);
    res.json(categoria);
  } catch (err) {
    next(err);
  }
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as CrearCategoriaDTO;
    const categoria = await categoriasService.crear(dto);
    res.status(201).json(categoria);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as ActualizarCategoriaDTO;
    const categoria = await categoriasService.actualizar(req.params.id, dto);
    res.json(categoria);
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await categoriasService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
