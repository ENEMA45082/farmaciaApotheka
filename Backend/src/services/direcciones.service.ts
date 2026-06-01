import * as direccionesRepo from '../repositories/direcciones.repository';
import { ErrorServicio } from './productos.service';
import type { Direccion, GuardarDireccionDTO } from '../types';

export async function obtener(userId: string): Promise<Direccion | null> {
  return direccionesRepo.obtener(userId);
}

export async function guardar(userId: string, dto: GuardarDireccionDTO): Promise<Direccion> {
  if (!dto.calle_numero?.trim()) throw new ErrorServicio('La calle es obligatoria', 400);
  if (!dto.ciudad?.trim())       throw new ErrorServicio('La ciudad es obligatoria', 400);
  if (!dto.provincia?.trim())    throw new ErrorServicio('La provincia es obligatoria', 400);
  return direccionesRepo.guardar(userId, dto);
}
