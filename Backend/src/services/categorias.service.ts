import * as categoriasRepo from '../repositories/categorias.repository';
import * as productosRepo from '../repositories/productos.repository';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import { recopilarDescendientes } from '../utils/categoriaTree';
import type { Categoria, CrearCategoriaDTO, ActualizarCategoriaDTO } from '../types';

function buildTree(flat: Categoria[]): Categoria[] {
  const map = new Map(flat.map(c => [c.id, { ...c, hijos: [] as Categoria[] }]));
  const roots: Categoria[] = [];
  for (const cat of map.values()) {
    if (cat.id_padre && map.has(cat.id_padre)) {
      map.get(cat.id_padre)!.hijos!.push(cat);
    } else {
      roots.push(cat);
    }
  }
  return roots;
}

export async function listar(): Promise<Categoria[]> {
  return categoriasRepo.encontrarTodas();
}

export async function obtenerArbol(): Promise<Categoria[]> {
  const flat = await categoriasRepo.encontrarTodas();
  return buildTree(flat);
}

export async function obtenerPorId(id: string): Promise<Categoria> {
  validarUUID(id, 'categoría');
  const categoria = await categoriasRepo.encontrarPorId(id);
  if (!categoria) {
    throw new AppError('Categoría no encontrada', 404);
  }
  return categoria;
}

export async function crear(dto: CrearCategoriaDTO): Promise<Categoria> {
  if (!dto.nombre?.trim()) {
    throw new AppError('El nombre de la categoría es obligatorio', 400);
  }
  return categoriasRepo.crear(dto.nombre.trim(), dto.id_padre);
}

export async function actualizar(id: string, dto: ActualizarCategoriaDTO): Promise<Categoria> {
  validarUUID(id, 'categoría');
  const cambios: Record<string, unknown> = {};
  if (dto.nombre !== undefined) {
    cambios.nombre = dto.nombre.trim();
  }
  if ('id_padre' in dto) {
    cambios.id_padre = dto.id_padre ?? null;
  }

  if (Object.keys(cambios).length === 0) {
    throw new AppError('Se debe enviar al menos un campo para actualizar', 400);
  }

  const categoria = await categoriasRepo.actualizar(id, cambios);
  if (!categoria) {
    throw new AppError('Categoría no encontrada', 404);
  }
  return categoria;
}

export async function eliminar(id: string): Promise<void> {
  validarUUID(id, 'categoría');
  await obtenerPorId(id);

  const todas = await categoriasRepo.encontrarTodas();
  const ids = recopilarDescendientes(id, todas.map(c => ({ id: c.id, id_padre: c.id_padre })));
  const cantidadProductos = await productosRepo.contarPorCategorias(ids);
  if (cantidadProductos > 0) {
    throw new AppError(
      `No se puede eliminar: hay ${cantidadProductos} producto(s) en esta categoría o sus subcategorías. Reasignalos o eliminalos primero.`,
      409,
    );
  }

  const eliminado = await categoriasRepo.eliminar(id);
  if (!eliminado) throw new AppError('No se pudo eliminar la categoría', 500);
}
