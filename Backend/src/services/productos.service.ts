import * as productosRepo from '../repositories/productos.repository';
import * as comboItemsRepo from '../repositories/comboItems.repository';
import { parsearCsvPrecios } from '../utils/parsearCsvPrecios';
import { normalizarCodigoBarras, nombresParecidos, precioOfertaTrasCambio } from '../utils/precioImportacion';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import type {
  Producto,
  ProductosPaginados,
  CrearProductoDTO,
  ActualizarProductoDTO,
  FiltrosProducto,
  CoincidenciaPrecio,
  ProductoSinCoincidencia,
  PreviewImportarPreciosResponse,
  ItemAplicarPrecio,
  ResultadoAplicarPrecios,
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
  if (producto.es_combo) {
    producto.combo_items = await comboItemsRepo.encontrarPorComboId(producto.id);
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

  const combosQueLoUsan = await comboItemsRepo.encontrarCombosQueUsanProducto(id);
  if (combosQueLoUsan.length > 0) {
    const nombres = [...new Set(combosQueLoUsan.map(c => c.combo_nombre))].join(', ');
    throw new AppError(
      `No se puede eliminar: este producto es componente de ${combosQueLoUsan.length === 1 ? 'combo' : 'combos'}: ${nombres}. Quitalo de ese combo primero.`,
      409,
      'PRODUCTO_COMPONENTE_DE_COMBO',
    );
  }

  await productosRepo.eliminar(id);
}

// El cotejo va del sistema hacia el CSV (no al revés): el CSV de droguería
// tiene ~14.000 filas y solo una fracción existe acá, así que se leen los
// productos propios (pocas consultas paginadas) y se buscan en un Map del CSV.
export async function previewImportarPrecios(
  buffer: Buffer
): Promise<PreviewImportarPreciosResponse> {
  const csv       = parsearCsvPrecios(buffer);
  const productos = await productosRepo.listarParaImportacion();

  const filaPorClave     = new Map(csv.filas.map(f => [normalizarCodigoBarras(f.codigoBarras), f]));
  const ambiguoPorClave  = new Map(csv.duplicadosAmbiguos.map(d => [normalizarCodigoBarras(d.codigoBarras), d]));
  const clavesEncontradas = new Set<string>();

  const coincidencias: CoincidenciaPrecio[]         = [];
  const sinCoincidencia: ProductoSinCoincidencia[]  = [];
  let sinCambio = 0;

  for (const p of productos) {
    const base = {
      producto_id:          p.id,
      codigo_barras:        p.codigo_barras,
      nombre:               p.nombre,
      precio_actual:        p.precio,
      en_oferta:            p.en_oferta,
      precio_oferta_actual: p.en_oferta ? p.precio_oferta : null,
    };

    const clave = p.codigo_barras ? normalizarCodigoBarras(p.codigo_barras) : '';
    if (!clave) {
      sinCoincidencia.push({ ...base, motivo: 'sin_codigo' });
      continue;
    }

    const fila = filaPorClave.get(clave);
    if (fila) {
      clavesEncontradas.add(clave);
      // El precio de la base puede traer más decimales que el del CSV.
      if (Math.abs(fila.precio - p.precio) < 0.005) {
        sinCambio++;
        continue;
      }
      coincidencias.push({
        producto_id:          p.id,
        codigo_barras:        p.codigo_barras!,
        nombre:               p.nombre,
        nombre_csv:           fila.nombre,
        nombre_distinto:      !nombresParecidos(p.nombre, fila.nombre),
        precio_actual:        p.precio,
        precio_nuevo:         fila.precio,
        en_oferta:            p.en_oferta,
        precio_oferta_actual: base.precio_oferta_actual,
        precio_oferta_nuevo:  precioOfertaTrasCambio(p, fila.precio),
      });
      continue;
    }

    const ambiguo = ambiguoPorClave.get(clave);
    if (ambiguo) {
      sinCoincidencia.push({
        ...base,
        motivo:     'duplicado_en_csv',
        precios_csv: [...new Set(ambiguo.filas.map(f => f.precio))],
      });
      continue;
    }

    sinCoincidencia.push({ ...base, motivo: 'no_esta_en_csv' });
  }

  const porNombre = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre, 'es');
  coincidencias.sort(porNombre);
  sinCoincidencia.sort(porNombre);

  return {
    resumen: {
      filas_csv:           csv.totalFilas,
      sin_codigo:          csv.filasSinCodigo,
      codigo_invalido:     csv.filasCodigoInvalido,
      precio_invalido:     csv.filasPrecioInvalido,
      mal_formadas:        csv.filasMalFormadas,
      duplicados_ambiguos: csv.duplicadosAmbiguos.length,
      con_cambio:          coincidencias.length,
      sin_cambio:          sinCambio,
      solo_en_csv:         csv.filas.length - clavesEncontradas.size,
      sin_coincidencia:    sinCoincidencia.length,
    },
    coincidencias,
    sin_coincidencia: sinCoincidencia,
  };
}

const MAX_ITEMS_APLICAR_PRECIO = 1000;
const CONCURRENCIA_APLICAR_PRECIO = 10;

// Aplica los precios que el admin aceptó (modal de cambios) o tipeó a mano
// (modal de sin coincidencia). Va por id de producto, no por código de barras,
// para que también sirva con productos que no tienen código. Si el producto
// está en oferta por %, se recalcula el precio de oferta manteniendo el %.
export async function aplicarCambiosPrecio(
  items: ItemAplicarPrecio[]
): Promise<ResultadoAplicarPrecios> {
  if (items.length === 0) {
    return { actualizados: 0, fallidos: [] };
  }
  if (items.length > MAX_ITEMS_APLICAR_PRECIO) {
    throw new AppError(
      `No se pueden procesar más de ${MAX_ITEMS_APLICAR_PRECIO} items por vez`,
      400,
      'ITEMS_LIMIT_EXCEEDED',
    );
  }

  for (const item of items) {
    if (!(item.precio_nuevo > 0)) {
      throw new AppError(
        `Precio inválido para el producto ${item.producto_id}: ${item.precio_nuevo}`,
        400,
        'PRODUCTO_PRECIO_INVALIDO',
      );
    }
  }

  // Si el mismo producto viene dos veces, gana el último.
  const precioPorId = new Map(items.map(i => [i.producto_id, i.precio_nuevo]));
  const productos   = await productosRepo.encontrarPreciosPorIds([...precioPorId.keys()]);

  const fallidos: ResultadoAplicarPrecios['fallidos'] = [];
  let actualizados = 0;

  const pendientes = [...precioPorId.entries()];
  for (let i = 0; i < pendientes.length; i += CONCURRENCIA_APLICAR_PRECIO) {
    await Promise.all(
      pendientes.slice(i, i + CONCURRENCIA_APLICAR_PRECIO).map(async ([id, precioNuevo]) => {
        const producto = productos.get(id);
        if (!producto) {
          fallidos.push({ producto_id: id, razon: 'Producto no encontrado' });
          return;
        }

        const precioOferta = precioOfertaTrasCambio(producto, precioNuevo);
        const cambios = precioOferta === null
          ? { precio: precioNuevo }
          : { precio: precioNuevo, precio_oferta: precioOferta };

        try {
          const ok = await productosRepo.actualizarPrecioYOferta(id, cambios);
          if (ok) actualizados++;
          else fallidos.push({ producto_id: id, razon: 'No se pudo actualizar' });
        } catch {
          fallidos.push({ producto_id: id, razon: 'Error de base de datos' });
        }
      })
    );
  }

  return { actualizados, fallidos };
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
    // Se guarda SIEMPRE bajo el id del item pedido (combo o no) — así el
    // pre-check de stock de pedidos.service.ts::crear (que itera dto.items,
    // no itemsConfirmados) sigue encontrando productos.get(item.producto_id)
    // para un combo y comparando contra su stock ya calculado (ver
    // productos.repository.ts). No hace falta tocar ese loop.
    productos.set(producto.id, producto);

    const pares          = producto.es_2x1 ? Math.floor(item.cantidad / 2) : 0;
    const descuentoTotal = pares * producto.precio;
    const precioUnitario = producto.en_oferta && producto.precio_oferta != null
      ? producto.precio_oferta
      : producto.precio;

    if (producto.es_combo) {
      const lineas = await explotarCombo(producto, item.cantidad, precioUnitario, descuentoTotal);
      itemsConfirmados.push(...lineas);
      continue;
    }

    itemsConfirmados.push({
      producto_id:     producto.id,
      nombre_producto: producto.nombre,
      cantidad:        item.cantidad,
      precio_unitario: precioUnitario,
      precio_lista:    producto.precio,
      descuento:       descuentoTotal,
    });
  }

  const total         = itemsConfirmados.reduce((s, i) => s + i.precio_unitario * i.cantidad - i.descuento, 0);
  const subtotalLista = itemsConfirmados.reduce((s, i) => s + i.precio_lista    * i.cantidad, 0);

  return { itemsConfirmados, total, subtotalLista, productos };
}

// Descompone UN item de carrito de combo en N líneas — una por cada
// producto que lo compone — para que crear_pedido_completo/descontar_stock
// nunca vean el id del combo, solo productos reales con stock real (evita
// tocar descontar_stock/restaurar_stock, que no están en este repo).
//
// precio_unitario de cada línea queda IGUAL al precio de catálogo real del
// componente (nunca una fracción inventada); todo el descuento/recargo que
// trae el combo respecto de comprar los componentes sueltos se concentra en
// `descuento`, mismo criterio que ya usa la promo 2x1 más arriba
// (precio_unitario intacto, descuento aparte).
async function explotarCombo(
  combo: Producto,
  cantidadCombos: number,
  precioUnitarioCombo: number,
  descuentoCombo: number,
): Promise<ItemPedidoConfirmado[]> {
  const componentes = await comboItemsRepo.encontrarPorComboId(combo.id);
  if (componentes.length === 0) {
    throw new AppError(`El combo "${combo.nombre}" no tiene componentes configurados`, 409, 'COMBO_SIN_COMPONENTES');
  }

  // Lo que el cliente paga en total por TODAS las unidades de combo
  // pedidas (ya neto de la oferta/2x1 del combo, si tiene) — esto es lo
  // único que hay que repartir entre los componentes reales.
  const subtotalCombo = precioUnitarioCombo * cantidadCombos - descuentoCombo;

  // Peso de reparto = valor de LISTA total que representa cada componente
  // dentro de todos los combos pedidos (precio de lista, no el efectivo —
  // así el reparto no depende de si el componente está también en oferta
  // por su cuenta).
  const pesos     = componentes.map(c => c.producto!.precio * c.cantidad * cantidadCombos);
  const pesoTotal = pesos.reduce((s, w) => s + w, 0);

  const lineas: ItemPedidoConfirmado[] = [];
  let asignado = 0;

  componentes.forEach((c, idx) => {
    const producto        = c.producto!;
    const cantidadReal    = c.cantidad * cantidadCombos;
    const valorListaLinea = producto.precio * cantidadReal;
    const esUltimo        = idx === componentes.length - 1;

    // El último componente se lleva el RESTO exacto (no una proporción
    // redondeada aparte) para que la suma de las N líneas cierre siempre,
    // centavo a centavo, contra subtotalCombo — sin este ajuste, redondear
    // cada proporción por separado podía dejar sobrando/faltando un
    // centavo. Si pesoTotal es 0 (todos los componentes en $0, caso
    // degenerado), se reparte por partes iguales para evitar NaN.
    const proporcion = pesoTotal > 0 ? pesos[idx] / pesoTotal : 1 / componentes.length;
    const subtotalLinea = esUltimo
      ? subtotalCombo - asignado
      : Math.round(subtotalCombo * proporcion * 100) / 100;
    asignado += subtotalLinea;

    lineas.push({
      producto_id:     producto.id,
      nombre_producto: producto.nombre,
      cantidad:        cantidadReal,
      precio_unitario: producto.precio,
      precio_lista:    producto.precio,
      descuento:       Math.round((valorListaLinea - subtotalLinea) * 100) / 100,
      combo_id:        combo.id,
      combo_nombre:    combo.nombre,
    });
  });

  return lineas;
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
