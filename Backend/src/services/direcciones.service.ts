import * as direccionesRepo from '../repositories/direcciones.repository';
import { AppError } from '../errors/AppError';
import { esCodigoProvinciaValido } from '../config/provincias';
import type { Direccion, GuardarDireccionDTO } from '../types';

export async function obtener(userId: string): Promise<Direccion | null> {
  return direccionesRepo.obtener(userId);
}

export async function guardar(userId: string, dto: GuardarDireccionDTO): Promise<Direccion> {
  if (!dto.calle?.trim())        throw new AppError('La calle es obligatoria', 400, 'DIRECCION_CALLE_REQUERIDA');
  if (!dto.altura?.trim())       throw new AppError('La altura es obligatoria', 400, 'DIRECCION_ALTURA_REQUERIDA');
  if (!dto.ciudad?.trim())       throw new AppError('La ciudad es obligatoria', 400, 'DIRECCION_CIUDAD_REQUERIDA');
  if (!dto.provincia?.trim())    throw new AppError('La provincia es obligatoria', 400, 'DIRECCION_PROVINCIA_REQUERIDA');
  if (!dto.provincia_codigo || !esCodigoProvinciaValido(dto.provincia_codigo)) {
    throw new AppError('El código de provincia es inválido', 400, 'DIRECCION_PROVINCIA_CODIGO_INVALIDO');
  }
  return direccionesRepo.guardar(userId, dto);
}
