import { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import type { AuthRequest } from '../types';

async function validarToken(req: Request, res: Response): Promise<User | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado: token requerido' });
    return null;
  }
  const token = header.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
    return null;
  }
  return user;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await validarToken(req, res);
  if (!user) return;
  (req as AuthRequest).user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await validarToken(req, res);
  if (!user) return;
  if (user.app_metadata?.role !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
    return;
  }
  (req as AuthRequest).user = user;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { next(); return; }
  const token = header.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (!error && user) (req as AuthRequest).user = user;
  next();
}
