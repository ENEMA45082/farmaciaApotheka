import type { Request, Response, NextFunction } from 'express';
import * as categoriasService from '../services/categorias.service';
import type { CrearCategoriaDTO, ActualizarCategoriaDTO, FiltrosCategoria } from '../types';

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.query ya viene validado y coercionado por validar(filtrosCategoriaQuerySchema).
    // Paginado opt-in: si no se manda busqueda/pagina/limite, se mantiene la
    // respuesta de siempre (array plano) para no romper a los otros consumidores
    // de este endpoint (home, selector de categoría del alta de productos, etc.).
    const filtros = req.query as unknown as FiltrosCategoria;
    const quierePaginado = filtros.busqueda !== undefined || filtros.pagina !== undefined || filtros.limite !== undefined;

    if (quierePaginado) {
      res.json(await categoriasService.listarPaginado(filtros));
      return;
    }

    res.json(await categoriasService.listar());
  } catch (err) {
    next(err);
  }
}

export async function obtenerArbol(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const arbol = await categoriasService.obtenerArbol();
    res.json(arbol);
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
