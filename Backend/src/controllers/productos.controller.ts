import type { Request, Response, NextFunction } from 'express';
import * as productosService from '../services/productos.service';
import { supabase } from '../config/supabase';
import type { CrearProductoDTO, ActualizarProductoDTO, FiltrosProducto } from '../types';

async function esAdmin(req: Request): Promise<boolean> {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return false;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.app_metadata?.role === 'admin';
}

// Controladores para manejar las rutas de productos
// Cada función maneja una operación CRUD

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminMode = await esAdmin(req);
    const filtros: FiltrosProducto = {
      adminMode,
      categoria:         req.query.categoria          as string | undefined,
      busqueda:          req.query.busqueda           as string | undefined,
      codigo_barras:     req.query.codigo_barras      as string | undefined,
      en_oferta:         req.query.en_oferta === 'true' ? true : req.query.en_oferta === 'false' ? false : undefined,
      precio_min:        req.query.precio_min  ? parseFloat(req.query.precio_min  as string) : undefined,
      precio_max:        req.query.precio_max  ? parseFloat(req.query.precio_max  as string) : undefined,
      stock_min:         req.query.stock_min   ? parseInt(req.query.stock_min     as string) : undefined,
      stock_max:         req.query.stock_max   ? parseInt(req.query.stock_max     as string) : undefined,
      vencimiento_desde: req.query.vencimiento_desde  as string | undefined,
      vencimiento_hasta: req.query.vencimiento_hasta  as string | undefined,
      pagina:            req.query.pagina ? parseInt(req.query.pagina as string) : undefined,
      limite:            req.query.limite ? parseInt(req.query.limite as string) : undefined,
      ordenar:           req.query.ordenar as FiltrosProducto['ordenar'] | undefined,
    };
    const resultado = await productosService.listar(filtros);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const producto = await productosService.obtenerPorId(req.params.id);
    res.json(producto);
  } catch (err) {
    next(err);
  }
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as CrearProductoDTO;
    const producto = await productosService.crear(dto);
    res.status(201).json(producto);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as ActualizarProductoDTO;
    const producto = await productosService.actualizar(req.params.id, dto);
    res.json(producto);
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await productosService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
