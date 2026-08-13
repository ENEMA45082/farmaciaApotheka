import { z } from 'zod';
import { CODIGOS_PROVINCIA_VALIDOS } from '../config/provincias';

export const cotizarEnvioSchema = z.object({
  items: z.array(z.object({
    peso_gramos: z.number().nonnegative().optional(),
    cantidad:    z.number().int().positive(),
  })).optional(),
  codigoPostal: z.string().min(1),
  // El formulario de destino de MiCorreo exige elegir la provincia (un
  // <select> propio, no se infiere del CP) antes de poder cotizar — ver
  // micorreoScraper.ts::completarDestinoYExtraerTarifas.
  provinciaCodigo: z.enum(CODIGOS_PROVINCIA_VALIDOS as [string, ...string[]]),
  // 'retiro_sucursal' está deshabilitado: el scraping de MiCorreo (ver
  // micorreoCotizacion.service.ts) solo automatiza el flujo "Entrega en
  // Domicilio" del portal, no "Entrega en Sucursal".
  metodo:       z.enum(['domicilio']),
});

export const sucursalesQuerySchema = z.object({
  provinciaCodigo: z.enum(CODIGOS_PROVINCIA_VALIDOS as [string, ...string[]]),
});
