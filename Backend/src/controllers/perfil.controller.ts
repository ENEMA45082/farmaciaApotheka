import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import * as perfilService from '../services/perfil.service';
import type { ActualizarPerfilDTO } from '../types';

type AuthRequest = Request & { user: User };

export async function obtener(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const perfil = await perfilService.obtener(userId);
    res.json(perfil);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const dto = req.body as ActualizarPerfilDTO;
    const perfil = await perfilService.actualizar(userId, dto);
    res.json(perfil);
  } catch (err) {
    next(err);
  }
}
