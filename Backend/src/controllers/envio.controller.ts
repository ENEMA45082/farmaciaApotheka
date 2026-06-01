import { Request, Response, NextFunction } from 'express';
import * as andreani from '../services/andreani.service';

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
      (sum, i) => sum + (i.peso_gramos ?? 500) * (i.cantidad ?? 1),
      0,
    );
    const valorDeclarado = 1000; // mínimo declarado, se puede mejorar pasando el total

    const resultado = metodo === 'domicilio'
      ? await andreani.cotizarDomicilio({ codigoPostal, pesoGramos: pesoTotal, valorDeclarado })
      : await andreani.cotizarSucursal({ codigoPostal, pesoGramos: pesoTotal, valorDeclarado });

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function sucursales(req: Request, res: Response, next: NextFunction) {
  try {
    const cp = req.query['cp'] as string;
    if (!cp) {
      res.status(400).json({ error: 'El parámetro cp (código postal) es requerido' });
      return;
    }
    const lista = await andreani.listarSucursales(cp);
    res.json(lista);
  } catch (err) {
    next(err);
  }
}
