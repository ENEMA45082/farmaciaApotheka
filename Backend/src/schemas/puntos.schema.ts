import { z } from 'zod';

export const crearPremioSchema = z.object({
  nombre:       z.string().min(1).max(200),
  descripcion:  z.string().max(1000).nullable().optional(),
  imagen_url:   z.string().url().max(500).nullable().optional(),
  costo_puntos: z.number().int().positive(),
  stock:        z.number().int().nonnegative().nullable().optional(),
  activo:       z.boolean().optional(),
});

export const actualizarPremioSchema = z.object({
  nombre:       z.string().min(1).max(200).optional(),
  descripcion:  z.string().max(1000).nullable().optional(),
  imagen_url:   z.string().url().max(500).nullable().optional(),
  costo_puntos: z.number().int().positive().optional(),
  stock:        z.number().int().nonnegative().nullable().optional(),
  activo:       z.boolean().optional(),
});

export const canjearPremioSchema = z.object({
  premio_id: z.string().uuid(),
});

export const buscarClienteDniSchema = z.object({
  dni: z.string().trim().min(1).max(30),
});

export const acreditarManualSchema = z.object({
  cliente_id: z.string().uuid(),
  puntos:     z.number().int().positive(),
  motivo:     z.string().max(300).nullable().optional(),
});
