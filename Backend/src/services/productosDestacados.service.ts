import * as productosDestacadosRepo from '../repositories/productosDestacados.repository';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import type { ProductoDestacado, CrearProductoDestacadoDTO, ActualizarProductoDestacadoDTO } from '../types';

export async function listar(): Promise<ProductoDestacado[]> {
  return productosDestacadosRepo.encontrarTodos();
}

export async function agregar(dto: CrearProductoDestacadoDTO): Promise<ProductoDestacado> {
  validarUUID(dto.producto_id, 'producto');

  const existente = await productosDestacadosRepo.encontrarPorProductoId(dto.producto_id);
  if (existente) {
    throw new AppError('Ese producto ya está en el carrusel de elegidos', 409, 'PRODUCTO_DESTACADO_DUPLICADO');
  }

  const ordenMax = await productosDestacadosRepo.obtenerOrdenMaximo();
  return productosDestacadosRepo.crear(dto.producto_id, ordenMax + 1);
}

export async function actualizar(id: string, dto: ActualizarProductoDestacadoDTO): Promise<ProductoDestacado> {
  validarUUID(id, 'producto destacado');

  if (dto.orden === undefined) {
    throw new AppError('Se debe enviar el nuevo orden', 400, 'SIN_CAMBIOS');
  }

  const actualizado = await productosDestacadosRepo.actualizar(id, dto.orden);
  if (!actualizado) {
    throw new AppError('Producto destacado no encontrado', 404, 'PRODUCTO_DESTACADO_NOT_FOUND');
  }
  return actualizado;
}

export async function eliminar(id: string): Promise<void> {
  validarUUID(id, 'producto destacado');
  const existe = await productosDestacadosRepo.encontrarPorId(id);
  if (!existe) {
    throw new AppError('Producto destacado no encontrado', 404, 'PRODUCTO_DESTACADO_NOT_FOUND');
  }
  await productosDestacadosRepo.eliminar(id);
}
