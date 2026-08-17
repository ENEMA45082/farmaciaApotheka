import * as bannersPromoRepo from '../repositories/bannersPromo.repository';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import type { BannerPromo, CrearBannerPromoDTO, ActualizarBannerPromoDTO } from '../types';

export async function listar(soloActivos: boolean): Promise<BannerPromo[]> {
  return bannersPromoRepo.encontrarTodos({ soloActivos });
}

export async function crear(dto: CrearBannerPromoDTO): Promise<BannerPromo> {
  if (!dto.imagen_url?.trim()) {
    throw new AppError('La imagen del banner es obligatoria', 400, 'BANNER_PROMO_IMAGEN_REQUERIDA');
  }
  if (!dto.titulo?.trim()) {
    throw new AppError('El título del banner es obligatorio', 400, 'BANNER_PROMO_TITULO_REQUERIDO');
  }

  return bannersPromoRepo.crear({
    imagen_url: dto.imagen_url.trim(),
    titulo: dto.titulo.trim(),
    vigencia_texto: dto.vigencia_texto?.trim() || null,
    badge_texto: dto.badge_texto?.trim() || null,
    tema: dto.tema ?? 'turquesa',
    link_url: dto.link_url?.trim() || null,
    orden: dto.orden ?? 0,
  });
}

export async function actualizar(id: string, dto: ActualizarBannerPromoDTO): Promise<BannerPromo> {
  validarUUID(id, 'banner promocional');

  const cambios: Record<string, unknown> = {};
  if (dto.imagen_url !== undefined) cambios.imagen_url = dto.imagen_url.trim();
  if (dto.titulo !== undefined) cambios.titulo = dto.titulo.trim();
  if ('vigencia_texto' in dto) cambios.vigencia_texto = dto.vigencia_texto?.trim() || null;
  if ('badge_texto' in dto) cambios.badge_texto = dto.badge_texto?.trim() || null;
  if (dto.tema !== undefined) cambios.tema = dto.tema;
  if ('link_url' in dto) cambios.link_url = dto.link_url?.trim() || null;
  if (dto.orden !== undefined) cambios.orden = dto.orden;
  if (dto.activo !== undefined) cambios.activo = dto.activo;

  if (Object.keys(cambios).length === 0) {
    throw new AppError('Se debe enviar al menos un campo para actualizar', 400, 'SIN_CAMBIOS');
  }

  const banner = await bannersPromoRepo.actualizar(id, cambios);
  if (!banner) {
    throw new AppError('Banner promocional no encontrado', 404, 'BANNER_PROMO_NOT_FOUND');
  }
  return banner;
}

export async function eliminar(id: string): Promise<void> {
  validarUUID(id, 'banner promocional');
  const existe = await bannersPromoRepo.encontrarPorId(id);
  if (!existe) {
    throw new AppError('Banner promocional no encontrado', 404, 'BANNER_PROMO_NOT_FOUND');
  }
  await bannersPromoRepo.eliminar(id);
}
