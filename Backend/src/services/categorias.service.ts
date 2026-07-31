import * as categoriasRepo from '../repositories/categorias.repository';
import * as productosRepo from '../repositories/productos.repository';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import { recopilarDescendientes } from '../utils/categoriaTree';
import type { Categoria, CrearCategoriaDTO, ActualizarCategoriaDTO } from '../types';

function tieneAntepasadoCiclico(id: string, mapa: Map<string, Categoria>): boolean {
  const visitados = new Set<string>([id]);
  let actual = mapa.get(id)?.id_padre ?? null;
  while (actual) {
    if (visitados.has(actual)) return true;
    visitados.add(actual);
    actual = mapa.get(actual)?.id_padre ?? null;
  }
  return false;
}

function construirArbol(flat: Categoria[]): Categoria[] {
  const map = new Map(flat.map(c => [c.id, { ...c, hijos: [] as Categoria[] }]));
  const roots: Categoria[] = [];
  for (const cat of map.values()) {
    // Defensa extra: crear()/actualizar() ya bloquean escribir un id_padre
    // cíclico, pero si de algún modo existiera uno igual en los datos, tratar
    // la categoría como raíz evita generar una referencia circular — con eso
    // res.json() (JSON.stringify) rompería con "Converting circular structure to JSON".
    if (cat.id_padre && map.has(cat.id_padre) && !tieneAntepasadoCiclico(cat.id, map)) {
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
  return construirArbol(flat);
}

export async function obtenerPorId(id: string): Promise<Categoria> {
  validarUUID(id, 'categoría');
  const categoria = await categoriasRepo.encontrarPorId(id);
  if (!categoria) {
    throw new AppError('Categoría no encontrada', 404, 'CATEGORIA_NOT_FOUND');
  }
  return categoria;
}

async function validarPadreExiste(idPadre: string): Promise<void> {
  const padre = await categoriasRepo.encontrarPorId(idPadre);
  if (!padre) {
    throw new AppError('La categoría padre indicada no existe', 400, 'CATEGORIA_PADRE_NOT_FOUND');
  }
}

export async function crear(dto: CrearCategoriaDTO): Promise<Categoria> {
  if (!dto.nombre?.trim()) {
    throw new AppError('El nombre de la categoría es obligatorio', 400, 'CATEGORIA_NOMBRE_REQUERIDO');
  }
  if (dto.id_padre) {
    await validarPadreExiste(dto.id_padre);
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
    if (dto.id_padre) {
      // Sin estos dos chequeos, se puede armar un ciclo en el árbol (una
      // categoría que termina siendo su propio antepasado) — eso rompe
      // GET /arbol (referencia circular) y DELETE (recursión infinita en
      // recopilarDescendientes). Ver categoriaTree.ts.
      if (dto.id_padre === id) {
        throw new AppError('Una categoría no puede ser su propia categoría padre', 400, 'CATEGORIA_PADRE_INVALIDO');
      }
      await validarPadreExiste(dto.id_padre);

      const todas = await categoriasRepo.encontrarTodas();
      const descendientes = recopilarDescendientes(id, todas.map(c => ({ id: c.id, id_padre: c.id_padre })));
      if (descendientes.includes(dto.id_padre)) {
        throw new AppError(
          'No se puede mover una categoría dentro de una de sus propias subcategorías',
          400,
          'CATEGORIA_PADRE_CICLO',
        );
      }
    }
    cambios.id_padre = dto.id_padre ?? null;
  }

  if (Object.keys(cambios).length === 0) {
    throw new AppError('Se debe enviar al menos un campo para actualizar', 400, 'SIN_CAMBIOS');
  }

  const categoria = await categoriasRepo.actualizar(id, cambios);
  if (!categoria) {
    throw new AppError('Categoría no encontrada', 404, 'CATEGORIA_NOT_FOUND');
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
      'CATEGORIA_CON_PRODUCTOS',
    );
  }

  const eliminado = await categoriasRepo.eliminar(id);
  if (!eliminado) throw new AppError('No se pudo eliminar la categoría', 500, 'CATEGORIA_ELIMINACION_FALLIDA');
}
