import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import * as perfilService from '../services/perfil.service';
import type { AuthRequest, ActualizarPerfilDTO } from '../types';

// Solo se usa para completar nombre/apellido la primera vez que se crea el
// perfil (ej. login con Google) — nunca pisa un valor ya guardado por el usuario.
function extraerNombreGoogle(user: User): { nombre?: string; apellido?: string } | undefined {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (!meta) return undefined;

  const givenName = meta.given_name as string | undefined;
  const familyName = meta.family_name as string | undefined;
  if (givenName || familyName) return { nombre: givenName, apellido: familyName };

  const fullName = (meta.full_name ?? meta.name) as string | undefined;
  if (!fullName?.trim()) return undefined;

  const [primero, ...resto] = fullName.trim().split(/\s+/);
  return { nombre: primero, apellido: resto.join(' ') || undefined };
}

export async function obtener(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authUser = (req as AuthRequest).user;
    const perfil = await perfilService.obtener(authUser.id, extraerNombreGoogle(authUser));
    res.json(perfil);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authUser = (req as AuthRequest).user;
    const dto = req.body as ActualizarPerfilDTO;
    const perfil = await perfilService.actualizar(authUser.id, dto, extraerNombreGoogle(authUser));
    res.json(perfil);
  } catch (err) {
    next(err);
  }
}
