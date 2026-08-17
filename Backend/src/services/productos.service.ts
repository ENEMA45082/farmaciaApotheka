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
  ItemCarritoInput,
  ItemPedidoConfirmado,
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
    throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NOT_FOUND');
  }
  return producto;
}

export async function crear(dto: CrearProductoDTO): Promise<Producto> {
  validarDatosCreacion(dto);
  validarDatosOferta(dto);

  const codigoBarras = dto.codigo_barras?.trim();
  if (codigoBarras) {
    const existente = await productosRepo.encontrarPorCodigoBarras(codigoBarras);
    if (existente) {
      throw new AppError(
        `Ya existe un producto con el código de barras "${codigoBarras}" (${existente.nombre})`,
        409,
        'PRODUCTO_CODIGO_BARRAS_DUPLICADO',
      );
    }
  }

  return productosRepo.crear({ ...dto, codigo_barras: codigoBarras });
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
  validarDatosOferta(dto);

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

// Resuelve items de carrito ({producto_id, cantidad}, lo único confiable que
// puede mandar el cliente) contra el catálogo real: precio, oferta y
// descuento de la promo 2x1. Usado tanto por pedidos.service.ts::crear como
// por cupones.service.ts::validar, para que ninguno de los dos calcule un
// total a partir de precios inventados por el cliente. No chequea stock —
// eso es responsabilidad de quien crea el pedido, no de una preview de
// precio/cupón; devuelve el mapa de productos resueltos para que el llamador
// pueda chequearlo sin volver a pegarle a la base.
export async function resolverItemsCarrito(items: ItemCarritoInput[]): Promise<{
  itemsConfirmados: ItemPedidoConfirmado[];
  total: number;
  subtotalLista: number;
  productos: Map<string, Producto>;
}> {
  const itemsConfirmados: ItemPedidoConfirmado[] = [];
  const productos = new Map<string, Producto>();

  for (const item of items) {
    const producto = await productosRepo.encontrarPorId(item.producto_id);
    if (!producto) {
      throw new AppError(`Producto no encontrado: ${item.producto_id}`, 404, 'PRODUCTO_NOT_FOUND');
    }
    productos.set(producto.id, producto);

    const pares     = producto.es_2x1 ? Math.floor(item.cantidad / 2) : 0;
    const descuento = pares * producto.precio;

    itemsConfirmados.push({
      producto_id:     producto.id,
      nombre_producto: producto.nombre,
      cantidad:        item.cantidad,
      precio_unitario: producto.en_oferta && producto.precio_oferta != null ? producto.precio_oferta : producto.precio,
      precio_lista:    producto.precio,
      descuento,
    });
  }

  const total         = itemsConfirmados.reduce((s, i) => s + i.precio_unitario * i.cantidad - i.descuento, 0);
  const subtotalLista = itemsConfirmados.reduce((s, i) => s + i.precio_lista    * i.cantidad, 0);

  return { itemsConfirmados, total, subtotalLista, productos };
}

function validarDatosCreacion(dto: CrearProductoDTO): void {
  if (!dto.nombre?.trim()) {
    throw new AppError('El nombre del producto es obligatorio', 400, 'PRODUCTO_NOMBRE_REQUERIDO');
  }
  if (dto.precio === undefined || dto.precio === null) {
    throw new AppError('El precio del producto es obligatorio', 400, 'PRODUCTO_PRECIO_REQUERIDO');
  }
  // <= 0 (no solo negativo) porque acá es alta: un producto nuevo no puede
  // arrancar gratis. En actualizar() sí se permite 0, para no romper una
  // edición futura de un producto ya cargado.
  if (dto.precio <= 0) {
    throw new AppError('El precio debe ser mayor a $0', 400, 'PRODUCTO_PRECIO_INVALIDO');
  }
  if (dto.stock !== undefined && dto.stock < 0) {
    throw new AppError('El stock no puede ser negativo', 400, 'PRODUCTO_STOCK_NEGATIVO');
  }
  // Solo en el alta: la fecha de vencimiento es opcional, pero si se carga
  // no puede ser anterior a hoy. En actualizar() no se restringe, para
  // permitir corregir una fecha ya cargada.
  if (dto.fecha_vencimiento && dto.fecha_vencimiento < fechaHoyISO()) {
    throw new AppError('La fecha de vencimiento no puede ser anterior a hoy', 400, 'PRODUCTO_VENCIMIENTO_INVALIDO');
  }
}

// Fecha local del servidor en formato YYYY-MM-DD, comparable como string
// contra dto.fecha_vencimiento (mismo formato, viene de un <input type="date">).
function fechaHoyISO(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

// El producto nunca debería quedar "en oferta" sin precio de oferta ni
// porcentaje (quedaría mostrado como oferta pero cobrando el precio de
// lista normal). El 2x1 es la excepción: ese descuento se calcula según
// la cantidad en el carrito, no necesita precio_oferta/porcentaje_oferta
// (ver oferta-section en AdminProductosPage.tsx). Se valida tanto en
// crear() como en actualizar() porque este estado nunca es válido,
// a diferencia de precio/stock en 0 que sí pueden darse después del alta.
function validarDatosOferta(dto: {
  precio?: number;
  en_oferta?: boolean;
  es_2x1?: boolean;
  precio_oferta?: number | null;
  porcentaje_oferta?: number | null;
}): void {
  if (!dto.en_oferta || dto.es_2x1) return;
  if (dto.precio_oferta == null || dto.porcentaje_oferta == null) {
    throw new AppError(
      'Si el producto está en oferta hay que cargar el precio de oferta y el porcentaje de descuento',
      400,
      'PRODUCTO_OFERTA_INCOMPLETA',
    );
  }
  // dto.precio puede venir undefined en un actualizar() parcial que no lo
  // toque; el form de admin siempre manda los dos juntos, así que en la
  // práctica esto siempre se puede chequear.
  if (dto.precio !== undefined && dto.precio_oferta >= dto.precio) {
    throw new AppError(
      'El precio de oferta debe ser menor al precio de lista',
      400,
      'PRODUCTO_OFERTA_PRECIO_INVALIDO',
    );
  }
}
