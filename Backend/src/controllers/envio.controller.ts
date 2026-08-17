import { Request, Response, NextFunction } from 'express';
import * as correoArgentino from '../services/correoArgentino.service';
import * as micorreoCotizacion from '../services/micorreoCotizacion.service';
import { PESO_DEFAULT_GRAMOS, CAJA_ESTANDAR_CM, VALOR_DECLARADO_MINIMO } from '../config/envioConfig';
import type { ProvinciaCodigo } from '../config/provincias';

// Cotización vía scraping del portal web de MiCorreo (Correo Argentino) —
// ver el comentario de cabecera en micorreoCotizacion.service.ts. Correo
// Argentino es el transportista real (correoArgentino.service.ts crea los
// envíos), pero el acceso a su API oficial de cotización nunca llegó; se
// automatiza en su lugar el flujo web con la cuenta de empresa. El schema
// (cotizarEnvioSchema) solo admite metodo: 'domicilio' por ahora —
// 'retiro_sucursal' queda deshabilitado.
export async function cotizar(req: Request, res: Response, next: NextFunction) {
  try {
    // req.body ya viene validado por validate(cotizarEnvioSchema)
    const { items, codigoPostal, provinciaCodigo } = req.body as {
      items?: { peso_gramos?: number; cantidad: number }[];
      codigoPostal: string;
      provinciaCodigo: ProvinciaCodigo;
    };

    const pesoTotalGramos = (items ?? []).reduce(
      // || (no ??): un producto sin peso cargado manda peso_gramos: 0, que
      // también tiene que caer al default — 0g reales no existen.
      (sum, i) => sum + (i.peso_gramos || PESO_DEFAULT_GRAMOS) * (i.cantidad ?? 1),
      0,
    );

    const resultado = await micorreoCotizacion.getShippingQuotes({
      cpDestino: codigoPostal,
      provinciaCodigo,
      pesoKg: pesoTotalGramos / 1000,
      altoCm: CAJA_ESTANDAR_CM.height,
      anchoCm: CAJA_ESTANDAR_CM.width,
      largoCm: CAJA_ESTANDAR_CM.length,
      valorDeclarado: VALOR_DECLARADO_MINIMO,
    });

    res.json({ opciones: resultado.opciones });
  } catch (err) {
    next(err);
  }
}

export async function sucursales(req: Request, res: Response, next: NextFunction) {
  try {
    // req.query ya viene validado por validate(sucursalesQuerySchema, 'query')
    const { provinciaCodigo } = req.query as unknown as { provinciaCodigo: import('../config/provincias').ProvinciaCodigo };
    const lista = await correoArgentino.listarSucursalesPorProvincia(provinciaCodigo);
    res.json(lista);
  } catch (err) {
    next(err);
  }
}
