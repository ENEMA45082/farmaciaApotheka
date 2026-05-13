import * as categoriasRepo from '../repositories/categorias.repository';
import { ErrorServicio } from './productos.service';
import type { Categoria, CrearCategoriaDTO, ActualizarCategoriaDTO } from '../types';

function generarSlug(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function listar(): Promise<Categoria[]> {
  return categoriasRepo.encontrarTodas();
}

export async function obtenerPorId(id: string): Promise<Categoria> {
  const categoria = await categoriasRepo.encontrarPorId(id);
  if (!categoria) {
    throw new ErrorServicio('Categoría no encontrada', 404);
  }
  return categoria;
}

export async function crear(dto: CrearCategoriaDTO): Promise<Categoria> {
  if (!dto.nombre?.trim()) {
    throw new ErrorServicio('El nombre de la categoría es obligatorio', 400);
  }
  const slug = generarSlug(dto.nombre.trim());
  return categoriasRepo.crear(dto.nombre.trim(), slug, dto.icono ?? null);
}

export async function actualizar(id: string, dto: ActualizarCategoriaDTO): Promise<Categoria> {
  if (!dto.nombre && dto.icono === undefined) {
    throw new ErrorServicio('Se debe enviar al menos un campo para actualizar', 400);
  }

  const cambios: Record<string, unknown> = {};
  if (dto.nombre !== undefined) {
    cambios.name = dto.nombre.trim();
    cambios.slug = generarSlug(dto.nombre.trim());
  }
  if (dto.icono !== undefined) {
    cambios.icon_name = dto.icono;
  }

  const categoria = await categoriasRepo.actualizar(id, cambios);
  if (!categoria) {
    throw new ErrorServicio('Categoría no encontrada', 404);
  }
  return categoria;
}

export async function eliminar(id: string): Promise<void> {
  await obtenerPorId(id);
  await categoriasRepo.eliminar(id);
}
