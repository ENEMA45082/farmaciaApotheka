import * as perfilRepo from '../repositories/perfil.repository';
import { validarDocumento } from '../utils/validarDocumento';
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
  const perfilActual = await perfilRepo.encontrarOCrear(userId, datosIniciales);

  if (dto.dni !== undefined || dto.documento_tipo !== undefined) {
    const tipo = dto.documento_tipo ?? perfilActual.documento_tipo;
    const numero = dto.dni ?? perfilActual.dni ?? '';
    validarDocumento(tipo, numero);
  }

  return perfilRepo.actualizar(userId, dto);
}
