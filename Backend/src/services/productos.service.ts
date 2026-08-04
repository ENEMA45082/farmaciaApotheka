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

// stock y fecha_vencimiento son información interna de inventario — el catálogo
// público (sin token de administrador) no debe poder ver stock exacto ni
// vencimientos de un competidor scrapeando /api/productos. En su lugar se manda
// en_stock (booleano) para que el frontend pueda mostrar disponibilidad y
// calcular cantidades sin depender del número real.
function ocultarCamposAdmin(producto: Producto, modoAdmin: boolean): Producto {
  const conEnStock = { ...producto, en_stock: producto.stock > 0 };
  if (modoAdmin) return conEnStock;
  const { stock: _stock, fecha_vencimiento: _fechaVencimiento, ...resto } = conEnStock;
  return resto as Producto;
}

export async function listar(filtros: FiltrosProducto): Promise<ProductosPaginados> {
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const limite = Math.min(50, Math.max(1, filtros.limite ?? 12));

  const { datos, total } = await productosRepo.encontrarTodos({ ...filtros, pagina, limite });
  const modoAdmin = filtros.adminMode ?? false;

  return {
    datos: datos.map(p => ocultarCamposAdmin(p, modoAdmin)),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  };
}

export async function obtenerPorId(id: string, modoAdmin = false): Promise<Producto> {
  validarUUID(id, 'producto');
  const producto = await productosRepo.encontrarPorId(id);
  if (!producto) {
    throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NOT_FOUND');
  }
  return ocultarCamposAdmin(producto, modoAdmin);
}

export async function crear(dto: CrearProductoDTO): Promise<Producto> {
  validarDatosCreacion(dto);
  return productosRepo.crear(dto);
}

export async function actualizar(id: string, dto: ActualizarProductoDTO): Promise<Producto> {
  validarUUID(id, 'producto');
  if (Object.keys(dto).length === 0) {
    throw new AppError('Se debe enviar al menos un campo para actualizar', 400, 'SIN_CAMBIOS');
  }
  if (dto.precio !== undefined && dto.precio < 0) {
    throw new AppError('El precio no puede ser negativo', 400, 'PRODUCTO_PRECIO_NEGATIVO');
  }
  if (dto.stock !== undefined && dto.stock < 0) {
    throw new AppError('El stock no puede ser negativo', 400, 'PRODUCTO_STOCK_NEGATIVO');
  }

  const producto = await productosRepo.actualizar(id, dto);
  if (!producto) {
    throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NOT_FOUND');
  }
  return producto;
}

export async function eliminar(id: string): Promise<void> {
  validarUUID(id, 'producto');
  const existe = await productosRepo.encontrarPorId(id);
  if (!existe) {
    throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NOT_FOUND');
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
        nombre:        fila.nombre,
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
    return { actualizados: 0, creados: 0, fallidos: [] };
  }
  if (items.length > 500) {
    throw new AppError('No se pueden procesar más de 500 items por vez', 400, 'ITEMS_LIMIT_EXCEEDED');
  }

  for (const item of items) {
    if (item.precio_nuevo < 0) {
      throw new AppError(
        `Precio inválido para ${item.codigo_barras}: ${item.precio_nuevo}`,
        400,
        'PRODUCTO_PRECIO_NEGATIVO',
      );
    }
  }

  const codigos = items.map(i => i.codigo_barras);
  const mapa    = await productosRepo.encontrarPorCodigosBarras(codigos);

  const resultados: { ok: boolean; creado?: boolean; codigo_barras: string; razon?: string }[] = [];
  for (const item of items) {
    const encontrado = mapa.get(item.codigo_barras);

    if (!encontrado) {
      const nombre = item.nombre?.trim();
      if (!nombre) {
        resultados.push({ ok: false, codigo_barras: item.codigo_barras, razon: 'No encontrado y sin nombre para crearlo' });
        continue;
      }
      try {
        await productosRepo.crear({
          nombre,
          precio:        item.precio_nuevo,
          codigo_barras: item.codigo_barras,
        });
        resultados.push({ ok: true, creado: true, codigo_barras: item.codigo_barras });
      } catch {
        resultados.push({ ok: false, codigo_barras: item.codigo_barras, razon: 'Error al crear el producto' });
      }
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

  const actualizados = resultados.filter(r => r.ok && !r.creado).length;
  const creados       = resultados.filter(r => r.ok && r.creado).length;
  const fallidos       = resultados
    .filter((r): r is { ok: false; codigo_barras: string; razon: string } => !r.ok)
    .map(r => ({ codigo_barras: r.codigo_barras, razon: r.razon }));

  return { actualizados, creados, fallidos };
}

function validarDatosCreacion(dto: CrearProductoDTO): void {
  if (!dto.nombre?.trim()) {
    throw new AppError('El nombre del producto es obligatorio', 400, 'PRODUCTO_NOMBRE_REQUERIDO');
  }
  if (dto.precio === undefined || dto.precio === null) {
    throw new AppError('El precio del producto es obligatorio', 400, 'PRODUCTO_PRECIO_REQUERIDO');
  }
  if (dto.precio < 0) {
    throw new AppError('El precio no puede ser negativo', 400, 'PRODUCTO_PRECIO_NEGATIVO');
  }
  if (dto.stock !== undefined && dto.stock < 0) {
    throw new AppError('El stock no puede ser negativo', 400, 'PRODUCTO_STOCK_NEGATIVO');
  }
}
