import type { NextFunction, Request, Response } from 'express';
import * as emailService from '../services/email.service';
import type { nuevoUsuarioWebhookSchema } from '../schemas/webhooks.schema';
import type { z } from 'zod';

type NuevoUsuarioBody = z.infer<typeof nuevoUsuarioWebhookSchema>;

function extraerNombre(meta: Record<string, unknown> | undefined): string | null {
  if (!meta) return null;
  const givenName = meta.given_name as string | undefined;
  if (givenName) return givenName;
  const fullName = (meta.full_name ?? meta.name) as string | undefined;
  return fullName?.trim().split(/\s+/)[0] ?? null;
}

// Va ANTES que validar(schema) en la ruta: así una request sin el secreto
// correcto nunca llega a ver el detalle de qué shape espera el body.
export function verificarSecreto(req: Request, res: Response, next: NextFunction): void {
  const secretEsperado = process.env.SUPABASE_WEBHOOK_SECRET;
  // !secretEsperado (no secretEsperado &&): si la env var falta, rechazar TODO en
  // vez de dejar pasar todo — la versión anterior "fail-open" saltaba el chequeo
  // entero cuando la var no estaba seteada (deploy sin esa env, typo en el nombre).
  if (!secretEsperado || req.query.secret !== secretEsperado) {
    console.error('[Webhook nuevo usuario] secreto inválido, ausente o no configurado — posible intento de forjado. IP:', req.ip);
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  next();
}

// Database Webhook de Supabase sobre auth.users (INSERT) — ver instrucciones
// de configuración en .env.example, bloque "Resend". Igual que
// pagos.controller.ts::notificacion: siempre responde 200 (Supabase
// reintenta si no recibe 2xx).
export async function nuevoUsuario(req: Request, res: Response): Promise<void> {
  const { record } = req.body as NuevoUsuarioBody;

  // Alta administrativa de un "cliente físico" (puntos.service.ts::
  // crearClienteFisico) — no es una adquisición real de cliente, no
  // corresponde mandarle un cupón de bienvenida a un email sintético.
  if (record.raw_user_meta_data?.es_cliente_fisico) {
    res.status(200).json({ ok: true });
    return;
  }

  const nombre = extraerNombre(record.raw_user_meta_data);

  try {
    await emailService.enviarCuponBienvenida(record.email, nombre);
  } catch (err) {
    console.error('[Webhook nuevo usuario] Error enviando cupón de bienvenida:', err);
  }
  res.status(200).json({ ok: true });
}
