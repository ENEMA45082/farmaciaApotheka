import { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import type { AuthRequest } from '../types';

async function validarToken(req: Request, res: Response): Promise<User | null> {
  const encabezado = req.headers.authorization;
  if (!encabezado?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado: token requerido' });
    return null;
  }
  const token = encabezado.split(' ')[1];
  const { data: { user: usuario }, error } = await supabase.auth.getUser(token);
  if (error || !usuario) {
    res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
    return null;
  }
  return usuario;
}

export async function requiereAutenticacion(req: Request, res: Response, next: NextFunction) {
  const usuario = await validarToken(req, res);
  if (!usuario) return;
  (req as AuthRequest).user = usuario;
  next();
}

export async function requiereAdmin(req: Request, res: Response, next: NextFunction) {
  const usuario = await validarToken(req, res);
  if (!usuario) return;
  if (usuario.app_metadata?.role !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
    return;
  }
  (req as AuthRequest).user = usuario;
  next();
}

export async function autenticacionOpcional(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const encabezado = req.headers.authorization;
  if (!encabezado?.startsWith('Bearer ')) { next(); return; }
  const token = encabezado.split(' ')[1];
  const { data: { user: usuario }, error } = await supabase.auth.getUser(token);
  if (!error && usuario) (req as AuthRequest).user = usuario;
  next();
}
