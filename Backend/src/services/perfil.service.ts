import * as perfilRepo from '../repositories/perfil.repository';
import type { Perfil, ActualizarPerfilDTO } from '../types';

export async function obtener(userId: string): Promise<Perfil> {
  return perfilRepo.encontrarOCrear(userId);
}

export async function actualizar(userId: string, dto: ActualizarPerfilDTO): Promise<Perfil> {
  await perfilRepo.encontrarOCrear(userId);
  return perfilRepo.actualizar(userId, dto);
}
