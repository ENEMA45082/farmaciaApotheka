import type { Request, Response } from 'express';
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

// Database Webhook de Supabase sobre auth.users (INSERT) — ver instrucciones
// de configuración en .env.example, bloque "Resend". Igual que
// pagos.controller.ts::notificacion: valida el secreto por query param y
// siempre responde 200 (Supabase reintenta si no recibe 2xx).
export async function nuevoUsuario(req: Request, res: Response): Promise<void> {
  const secretEsperado = process.env.SUPABASE_WEBHOOK_SECRET;
  if (secretEsperado && req.query.secret !== secretEsperado) {
    console.error('[Webhook nuevo usuario] secreto inválido o ausente — posible intento de forjado. IP:', req.ip);
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const { record } = req.body as NuevoUsuarioBody;
  const nombre = extraerNombre(record.raw_user_meta_data);

  try {
    await emailService.enviarCuponBienvenida(record.email, nombre);
  } catch (err) {
    console.error('[Webhook nuevo usuario] Error enviando cupón de bienvenida:', err);
  }
  res.status(200).json({ ok: true });
}
