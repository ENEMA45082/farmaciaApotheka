import * as productosRepo from '../repositories/productos.repository';
import { parsearCsvPrecios } from '../utils/parsearCsvPrecios';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import type {
  Producto,
  ProductosPaginados,
  CrearProductoDTO,
  ActualizarProductoDTO,
  FiltrosProducto,
  PreviewImportarPreciosResponse,
  ItemConfirmarPrecio,
  ResultadoConfirmarPrecios,
} from '../types';

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
  validarUUID(id, 'producto');
  const producto = await productosRepo.encontrarPorId(id);
  if (!producto) {
    throw new AppError('Producto no encontrado', 404);
  }
  return producto;
}

export async function crear(dto: CrearProductoDTO): Promise<Producto> {
  validarDatosCreacion(dto);
  return productosRepo.crear(dto);
}

export async function actualizar(id: string, dto: ActualizarProductoDTO): Promise<Producto> {
  validarUUID(id, 'producto');
  if (Object.keys(dto).length === 0) {
    throw new AppError('Se debe enviar al menos un campo para actualizar', 400);
  }
  if (dto.precio !== undefined && dto.precio < 0) {
    throw new AppError('El precio no puede ser negativo', 400);
  }
  if (dto.stock !== undefined && dto.stock < 0) {
    throw new AppError('El stock no puede ser negativo', 400);
  }

  const producto = await productosRepo.actualizar(id, dto);
  if (!producto) {
    throw new AppError('Producto no encontrado', 404);
  }
  return producto;
}

export async function eliminar(id: string): Promise<void> {
  validarUUID(id, 'producto');
  const existe = await productosRepo.encontrarPorId(id);
  if (!existe) {
    throw new AppError('Producto no encontrado', 404);
  }
  await productosRepo.eliminar(id);
}

export async function previewImportarPrecios(
  buffer: Buffer
): Promise<PreviewImportarPreciosResponse> {
  const { filas } = parsearCsvPrecios(buffer);

  const codigos = filas.map(f => f.codigoBarras);
  const mapa = await productosRepo.encontrarPorCodigosBarras(codigos);

  const actualizaciones: PreviewImportarPreciosResponse['actualizaciones'] = [];
  const no_encontrados: PreviewImportarPreciosResponse['no_encontrados']   = [];

  for (const fila of filas) {
    const encontrado = mapa.get(fila.codigoBarras);
    if (encontrado) {
      actualizaciones.push({
        codigo_barras: fila.codigoBarras,
        nombre:        encontrado.nombre,
        precio_actual: encontrado.precio,
        precio_nuevo:  fila.precio,
      });
    } else {
      no_encontrados.push({
        codigo_barras: fila.codigoBarras,
        precio_csv:    fila.precio,
      });
    }
  }

  return { actualizaciones, no_encontrados };
}

export async function confirmarImportarPrecios(
  items: ItemConfirmarPrecio[]
): Promise<ResultadoConfirmarPrecios> {
  if (items.length === 0) {
    return { actualizados: 0, fallidos: [] };
  }
  if (items.length > 500) {
    throw new AppError('No se pueden procesar más de 500 items por vez', 400, 'ITEMS_LIMIT_EXCEEDED');
  }

  for (const item of items) {
    if (item.precio_nuevo < 0) {
      throw new AppError(
        `Precio inválido para ${item.codigo_barras}: ${item.precio_nuevo}`,
        400
      );
    }
  }

  const codigos = items.map(i => i.codigo_barras);
  const mapa    = await productosRepo.encontrarPorCodigosBarras(codigos);

  const resultados: { ok: boolean; codigo_barras: string; razon?: string }[] = [];
  for (const item of items) {
    const encontrado = mapa.get(item.codigo_barras);
    if (!encontrado) {
      resultados.push({ ok: false, codigo_barras: item.codigo_barras, razon: 'No encontrado' });
      continue;
    }
    try {
      const ok = await productosRepo.actualizarPrecioPorId(encontrado.id, item.precio_nuevo);
      resultados.push(
        ok
          ? { ok: true,  codigo_barras: item.codigo_barras }
          : { ok: false, codigo_barras: item.codigo_barras, razon: 'No se pudo actualizar' }
      );
    } catch {
      resultados.push({ ok: false, codigo_barras: item.codigo_barras, razon: 'Error de base de datos' });
    }
  }

  const actualizados = resultados.filter(r => r.ok).length;
  const fallidos     = resultados
    .filter((r): r is { ok: false; codigo_barras: string; razon: string } => !r.ok)
    .map(r => ({ codigo_barras: r.codigo_barras, razon: r.razon }));

  return { actualizados, fallidos };
}

function validarDatosCreacion(dto: CrearProductoDTO): void {
  if (!dto.nombre?.trim()) {
    throw new AppError('El nombre del producto es obligatorio', 400);
  }
  if (dto.precio === undefined || dto.precio === null) {
    throw new AppError('El precio del producto es obligatorio', 400);
  }
  if (dto.precio < 0) {
    throw new AppError('El precio no puede ser negativo', 400);
  }
  if (dto.stock !== undefined && dto.stock < 0) {
    throw new AppError('El stock no puede ser negativo', 400);
  }
}
