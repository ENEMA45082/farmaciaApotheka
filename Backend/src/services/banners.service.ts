import * as bannersRepo from '../repositories/banners.repository';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import type { Banner, CrearBannerDTO, ActualizarBannerDTO } from '../types';

export async function listar(soloActivos: boolean): Promise<Banner[]> {
  return bannersRepo.encontrarTodos({ soloActivos });
}

export async function crear(dto: CrearBannerDTO): Promise<Banner> {
  if (!dto.imagen_url?.trim()) {
    throw new AppError('La imagen del banner es obligatoria', 400);
  }
  if (!dto.alt_texto?.trim()) {
    throw new AppError('El texto alternativo del banner es obligatorio', 400);
  }

  return bannersRepo.crear({
    imagen_url: dto.imagen_url.trim(),
    link_url: dto.link_url?.trim() || null,
    alt_texto: dto.alt_texto.trim(),
    orden: dto.orden ?? 0,
  });
}

export async function actualizar(id: string, dto: ActualizarBannerDTO): Promise<Banner> {
  validarUUID(id, 'banner');

  const cambios: Record<string, unknown> = {};
  if (dto.imagen_url !== undefined) cambios.imagen_url = dto.imagen_url.trim();
  if (dto.alt_texto !== undefined) cambios.alt_texto = dto.alt_texto.trim();
  if ('link_url' in dto) cambios.link_url = dto.link_url?.trim() || null;
  if (dto.orden !== undefined) cambios.orden = dto.orden;
  if (dto.activo !== undefined) cambios.activo = dto.activo;

  if (Object.keys(cambios).length === 0) {
    throw new AppError('Se debe enviar al menos un campo para actualizar', 400);
  }

  const banner = await bannersRepo.actualizar(id, cambios);
  if (!banner) {
    throw new AppError('Banner no encontrado', 404);
  }
  return banner;
}

export async function eliminar(id: string): Promise<void> {
  validarUUID(id, 'banner');
  const existe = await bannersRepo.encontrarPorId(id);
  if (!existe) {
    throw new AppError('Banner no encontrado', 404);
  }
  await bannersRepo.eliminar(id);
}
