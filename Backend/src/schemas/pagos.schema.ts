import { z } from 'zod';

export const pagarSchema = z.object({
  pedidoId:        z.string().uuid(),
  token:           z.string().min(1),
  bin:             z.string().min(1),
  cuotas:          z.number().int().positive().optional(),
  paymentMethodId: z.number().int().positive().optional(),
});

export const checkoutSchema = z.object({
  pedidoId: z.string().uuid(),
});
