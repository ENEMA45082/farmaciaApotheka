import type { Request, Response, NextFunction } from 'express';
import * as puntosService from '../services/puntos.service';
import type { AuthRequest, CrearPremioDTO, ActualizarPremioDTO, AcreditarPuntosManualDTO } from '../types';

export async function obtenerMiSaldo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const saldo = await puntosService.obtenerMiSaldo(userId);
    res.json(saldo);
  } catch (err) { next(err); }
}

export async function catalogo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const premios = await puntosService.listarCatalogo();
    res.json(premios);
  } catch (err) { next(err); }
}

export async function canjear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user.id;
    const { premio_id } = req.body as { premio_id: string };
    const canje = await puntosService.canjear(userId, premio_id);
    res.status(201).json(canje);
  } catch (err) { next(err); }
}

export async function crearPremio(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as CrearPremioDTO;
    const premio = await puntosService.crearPremio(dto);
    res.status(201).json(premio);
  } catch (err) { next(err); }
}

export async function listarPremiosAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const premios = await puntosService.listarPremiosAdmin();
    res.json(premios);
  } catch (err) { next(err); }
}

export async function actualizarPremio(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as ActualizarPremioDTO;
    const premio = await puntosService.actualizarPremio(req.params.id, dto);
    res.json(premio);
  } catch (err) { next(err); }
}

export async function listarCanjesAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const canjes = await puntosService.listarCanjesAdmin();
    res.json(canjes);
  } catch (err) { next(err); }
}

export async function buscarClientePorDni(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { dni } = req.query as { dni: string };
    const clientes = await puntosService.buscarClientePorDni(dni);
    res.json(clientes);
  } catch (err) { next(err); }
}

export async function acreditarManual(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as AcreditarPuntosManualDTO;
    const saldo = await puntosService.acreditarManual(dto);
    res.status(201).json({ saldo });
  } catch (err) { next(err); }
}
