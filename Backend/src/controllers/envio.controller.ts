import { Request, Response, NextFunction } from 'express';
import * as correoArgentino from '../services/correoArgentino.service';
import { esCodigoProvinciaValido } from '../config/provincias';
import { PESO_DEFAULT_GRAMOS } from '../config/envioConfig';

export async function cotizar(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, codigoPostal, metodo } = req.body as {
      items: { peso_gramos?: number; cantidad: number }[];
      codigoPostal: string;
      metodo: 'domicilio' | 'retiro_sucursal';
    };

    if (!codigoPostal || !metodo) {
      res.status(400).json({ error: 'codigoPostal y metodo son requeridos' });
      return;
    }

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
    const provinciaCodigo = req.query['provinciaCodigo'] as string;
    if (!provinciaCodigo || !esCodigoProvinciaValido(provinciaCodigo)) {
      res.status(400).json({ error: 'El parámetro provinciaCodigo es requerido y debe ser válido' });
      return;
    }
    const lista = await correoArgentino.listarSucursalesPorProvincia(provinciaCodigo);
    res.json(lista);
  } catch (err) {
    next(err);
  }
}
