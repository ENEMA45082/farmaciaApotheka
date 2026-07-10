import * as perfilRepo from '../repositories/perfil.repository';
import type { Perfil, ActualizarPerfilDTO } from '../types';

export async function obtener(
  userId: string,
  datosIniciales?: { nombre?: string; apellido?: string },
): Promise<Perfil> {
  return perfilRepo.encontrarOCrear(userId, datosIniciales);
}

export async function actualizar(
  userId: string,
  dto: ActualizarPerfilDTO,
  datosIniciales?: { nombre?: string; apellido?: string },
): Promise<Perfil> {
  await perfilRepo.encontrarOCrear(userId, datosIniciales);
  return perfilRepo.actualizar(userId, dto);
}
