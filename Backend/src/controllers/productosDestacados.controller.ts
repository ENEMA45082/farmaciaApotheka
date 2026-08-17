import type { Request, Response, NextFunction } from 'express';
import * as productosDestacadosService from '../services/productosDestacados.service';
import type { CrearProductoDestacadoDTO, ActualizarProductoDestacadoDTO } from '../types';

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productosDestacados = await productosDestacadosService.listar();
    res.json(productosDestacados);
  } catch (err) {
    next(err);
  }
}

export async function agregar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as CrearProductoDestacadoDTO;
    const productoDestacado = await productosDestacadosService.agregar(dto);
    res.status(201).json(productoDestacado);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as ActualizarProductoDestacadoDTO;
    const productoDestacado = await productosDestacadosService.actualizar(req.params.id, dto);
    res.json(productoDestacado);
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await productosDestacadosService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
