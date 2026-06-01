import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import * as direccionesService from '../services/direcciones.service';
import type { GuardarDireccionDTO } from '../types';

type AuthRequest = Request & { user: User };

export async function obtener(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const direccion = await direccionesService.obtener(userId);
    res.json(direccion ?? null);
  } catch (err) { next(err); }
}

export async function guardar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const direccion = await direccionesService.guardar(userId, req.body as GuardarDireccionDTO);
    res.json(direccion);
  } catch (err) { next(err); }
}
