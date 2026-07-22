import { Request, Response, NextFunction } from 'express';
import * as correoArgentino from '../services/correoArgentino.service';
import { PESO_DEFAULT_GRAMOS } from '../config/envioConfig';

export async function cotizar(req: Request, res: Response, next: NextFunction) {
  try {
    // req.body ya viene validado por validate(cotizarEnvioSchema)
    const { items, codigoPostal, metodo } = req.body as {
      items?: { peso_gramos?: number; cantidad: number }[];
      codigoPostal: string;
      metodo: 'domicilio' | 'retiro_sucursal';
    };

    const pesoTotal = (items ?? []).reduce(
      (sum, i) => sum + (i.peso_gramos ?? PESO_DEFAULT_GRAMOS) * (i.cantidad ?? 1),
      0,
    );

    const resultado = await correoArgentino.cotizar({
      postalCodeOrigin: process.env.CORREO_AR_POSTAL_CODE_ORIGIN ?? '',
      postalCodeDestination: codigoPostal,
      deliveredType: metodo === 'domicilio' ? 'D' : 'S',
      pesoGramos: pesoTotal,
    });

    res.json(resultado);
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
