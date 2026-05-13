import * as productosRepo from '../repositories/productos.repository';
import type {
  Producto,
  ProductosPaginados,
  CrearProductoDTO,
  ActualizarProductoDTO,
  FiltrosProducto,
} from '../types';

export class ErrorServicio extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'ErrorServicio';
  }
}

export async function listar(filtros: FiltrosProducto): Promise<ProductosPaginados> {
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const limite = Math.min(50, Math.max(1, filtros.limite ?? 12));

  const { datos, total } = await productosRepo.encontrarTodos({ ...filtros, pagina, limite });

  return {
    datos,
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  };
}

export async function obtenerPorId(id: string): Promise<Producto> {
  const producto = await productosRepo.encontrarPorId(id);
  if (!producto) {
    throw new ErrorServicio('Producto no encontrado', 404);
  }
  return producto;
}

export async function crear(dto: CrearProductoDTO): Promise<Producto> {
  validarDatosCreacion(dto);
  return productosRepo.crear(dto);
}

export async function actualizar(id: string, dto: ActualizarProductoDTO): Promise<Producto> {
  if (Object.keys(dto).length === 0) {
    throw new ErrorServicio('Se debe enviar al menos un campo para actualizar', 400);
  }
  if (dto.precio !== undefined && dto.precio < 0) {
    throw new ErrorServicio('El precio no puede ser negativo', 400);
  }
  if (dto.stock !== undefined && dto.stock < 0) {
    throw new ErrorServicio('El stock no puede ser negativo', 400);
  }

  const producto = await productosRepo.actualizar(id, dto);
  if (!producto) {
    throw new ErrorServicio('Producto no encontrado', 404);
  }
  return producto;
}

export async function eliminar(id: string): Promise<void> {
  const existe = await productosRepo.encontrarPorId(id);
  if (!existe) {
    throw new ErrorServicio('Producto no encontrado', 404);
  }
  await productosRepo.eliminar(id);
}

function validarDatosCreacion(dto: CrearProductoDTO): void {
  if (!dto.nombre?.trim()) {
    throw new ErrorServicio('El nombre del producto es obligatorio', 400);
  }
  if (dto.precio === undefined || dto.precio === null) {
    throw new ErrorServicio('El precio del producto es obligatorio', 400);
  }
  if (dto.precio < 0) {
    throw new ErrorServicio('El precio no puede ser negativo', 400);
  }
  if (dto.stock !== undefined && dto.stock < 0) {
    throw new ErrorServicio('El stock no puede ser negativo', 400);
  }
}
