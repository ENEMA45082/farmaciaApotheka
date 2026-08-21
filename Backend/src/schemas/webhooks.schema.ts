import { z } from 'zod';

// Payload que manda un Database Webhook de Supabase configurado sobre
// auth.users sobre INSERT. Solo se validan los campos que se usan; el resto
// del registro (id, created_at, raw_app_meta_data, etc.) se ignora.
export const nuevoUsuarioWebhookSchema = z.object({
  type:   z.literal('INSERT'),
  table:  z.string(),
  record: z.object({
    email: z.string().email(),
    raw_user_meta_data: z.record(z.string(), z.unknown()).optional(),
  }).passthrough(),
}).passthrough();
