import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Producto, ComboItem, ProductoParaImportacion } from '../types';

const { encontrarPorId, listarParaImportacion, encontrarPreciosPorIds, actualizarPrecioYOferta } = vi.hoisted(() => ({
  encontrarPorId: vi.fn(),
  listarParaImportacion: vi.fn(),
  encontrarPreciosPorIds: vi.fn(),
  actualizarPrecioYOferta: vi.fn(),
}));
const { encontrarPorComboId } = vi.hoisted(() => ({
  encontrarPorComboId: vi.fn(),
}));

// Mock parcial (solo las funciones que usan estos tests) — comboItems.repository.ts
// importa mapearProducto de este módulo, pero ninguno de estos tests hace que se
// invoque de verdad (solo se llama al mapear filas reales de Supabase), así
// que no hace falta mockearlo acá.
vi.mock('../repositories/productos.repository', () => ({
  encontrarPorId,
  listarParaImportacion,
  encontrarPreciosPorIds,
  actualizarPrecioYOferta,
}));
vi.mock('../repositories/comboItems.repository', () => ({ encontrarPorComboId }));

import { resolverItemsCarrito, previewImportarPrecios, aplicarCambiosPrecio } from './productos.service';

function producto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 'prod-1',
    nombre: 'Producto real',
    descripcion: null,
    precio: 500,
    en_oferta: false,
    precio_oferta: null,
    porcentaje_oferta: null,
    es_2x1: false,
    imagen_url: null,
    categoria_id: null,
    stock: 10,
    codigo_barras: null,
    fecha_vencimiento: null,
    imagenes: [],
    creado_en: '2026-07-11T00:00:00.000Z',
    es_venta_libre: true,
    peso_gramos: 100,
    alicuota_iva: 21,
    es_combo: false,
    ...overrides,
  };
}

function comboItem(overrides: Partial<ComboItem> = {}): ComboItem {
  return {
    id: 'ci-1',
    combo_id: 'combo-1',
    producto_id: 'comp-1',
    cantidad: 1,
    creado_en: '2026-07-11T00:00:00.000Z',
    producto: producto({ id: 'comp-1' }),
    ...overrides,
  };
}

beforeEach(() => {
  encontrarPorId.mockReset();
  encontrarPorComboId.mockReset();
  listarParaImportacion.mockReset();
  encontrarPreciosPorIds.mockReset();
  actualizarPrecioYOferta.mockReset();
});

describe('resolverItemsCarrito', () => {
  it('resuelve un item normal (no combo) igual que antes', async () => {
    encontrarPorId.mockResolvedValue(producto({ id: 'prod-1', precio: 500 }));

    const resultado = await resolverItemsCarrito([{ producto_id: 'prod-1', cantidad: 2 }]);

    expect(resultado.itemsConfirmados).toEqual([{
      producto_id:     'prod-1',
      nombre_producto: 'Producto real',
      cantidad:        2,
      precio_unitario: 500,
      precio_lista:    500,
      descuento:       0,
    }]);
    expect(resultado.total).toBe(1000);
    expect(resultado.subtotalLista).toBe(1000);
    expect(resultado.productos.get('prod-1')).toEqual(expect.objectContaining({ id: 'prod-1' }));
    expect(encontrarPorComboId).not.toHaveBeenCalled();
  });

  it('un combo de 2 componentes explota en 2 líneas, con cantidades multiplicadas por la cantidad pedida', async () => {
    const combo = producto({ id: 'combo-1', nombre: 'Kit Resfrío', precio: 900, es_combo: true });
    encontrarPorId.mockResolvedValue(combo);
    encontrarPorComboId.mockResolvedValue([
      comboItem({ id: 'ci-1', producto_id: 'comp-1', cantidad: 2, producto: producto({ id: 'comp-1', nombre: 'Ibuprofeno', precio: 500 }) }),
      comboItem({ id: 'ci-2', producto_id: 'comp-2', cantidad: 1, producto: producto({ id: 'comp-2', nombre: 'Jarabe', precio: 300 }) }),
    ]);

    const resultado = await resolverItemsCarrito([{ producto_id: 'combo-1', cantidad: 2 }]);

    expect(resultado.itemsConfirmados).toHaveLength(2);
    expect(resultado.itemsConfirmados[0]).toEqual(expect.objectContaining({
      producto_id: 'comp-1', nombre_producto: 'Ibuprofeno', cantidad: 4, combo_id: 'combo-1', combo_nombre: 'Kit Resfrío',
    }));
    expect(resultado.itemsConfirmados[1]).toEqual(expect.objectContaining({
      producto_id: 'comp-2', nombre_producto: 'Jarabe', cantidad: 2, combo_id: 'combo-1', combo_nombre: 'Kit Resfrío',
    }));
  });

  it.each([
    { precioCombo: 900, cantidadPedida: 1 },
    { precioCombo: 999, cantidadPedida: 3 },
    { precioCombo: 100, cantidadPedida: 7 },
  ])('la suma de las líneas explotadas da exactamente precio_combo × cantidad, sin perder centavos ($precioCombo x $cantidadPedida)', async ({ precioCombo, cantidadPedida }) => {
    const combo = producto({ id: 'combo-1', nombre: 'Kit', precio: precioCombo, es_combo: true });
    encontrarPorId.mockResolvedValue(combo);
    encontrarPorComboId.mockResolvedValue([
      comboItem({ id: 'ci-1', producto_id: 'comp-1', cantidad: 2, producto: producto({ id: 'comp-1', precio: 333 }) }),
      comboItem({ id: 'ci-2', producto_id: 'comp-2', cantidad: 3, producto: producto({ id: 'comp-2', precio: 777 }) }),
      comboItem({ id: 'ci-3', producto_id: 'comp-3', cantidad: 1, producto: producto({ id: 'comp-3', precio: 111 }) }),
    ]);

    const resultado = await resolverItemsCarrito([{ producto_id: 'combo-1', cantidad: cantidadPedida }]);

    const sumaLineas = resultado.itemsConfirmados.reduce((s, i) => s + i.precio_unitario * i.cantidad - i.descuento, 0);
    expect(sumaLineas).toBeCloseTo(precioCombo * cantidadPedida, 2);
    expect(resultado.total).toBeCloseTo(precioCombo * cantidadPedida, 2);
  });

  it('el Map de productos devuelto sigue conteniendo el combo bajo su propio id (con su stock ya calculado)', async () => {
    const combo = producto({ id: 'combo-1', es_combo: true, stock: 5 });
    encontrarPorId.mockResolvedValue(combo);
    encontrarPorComboId.mockResolvedValue([
      comboItem({ producto_id: 'comp-1', cantidad: 1, producto: producto({ id: 'comp-1' }) }),
      comboItem({ producto_id: 'comp-2', cantidad: 1, producto: producto({ id: 'comp-2' }) }),
    ]);

    const resultado = await resolverItemsCarrito([{ producto_id: 'combo-1', cantidad: 1 }]);

    // Esto es lo que mantiene funcionando sin cambios el pre-check de
    // pedidos.service.ts::crear, que hace productos.get(item.producto_id)!
    // sobre el id del combo (no de sus componentes).
    expect(resultado.productos.get('combo-1')).toEqual(expect.objectContaining({ id: 'combo-1', stock: 5 }));
  });

  it('un combo sin componentes configurados tira COMBO_SIN_COMPONENTES', async () => {
    encontrarPorId.mockResolvedValue(producto({ id: 'combo-1', nombre: 'Vacío', es_combo: true }));
    encontrarPorComboId.mockResolvedValue([]);

    await expect(resolverItemsCarrito([{ producto_id: 'combo-1', cantidad: 1 }]))
      .rejects.toMatchObject({ code: 'COMBO_SIN_COMPONENTES', statusCode: 409 });
  });

  it('la oferta propia del combo se reparte proporcionalmente entre los componentes, no se pierde', async () => {
    const combo = producto({ id: 'combo-1', precio: 1000, en_oferta: true, precio_oferta: 800, es_combo: true });
    encontrarPorId.mockResolvedValue(combo);
    encontrarPorComboId.mockResolvedValue([
      comboItem({ producto_id: 'comp-1', cantidad: 1, producto: producto({ id: 'comp-1', precio: 600 }) }),
      comboItem({ producto_id: 'comp-2', cantidad: 1, producto: producto({ id: 'comp-2', precio: 400 }) }),
    ]);

    const resultado = await resolverItemsCarrito([{ producto_id: 'combo-1', cantidad: 1 }]);

    const sumaLineas = resultado.itemsConfirmados.reduce((s, i) => s + i.precio_unitario * i.cantidad - i.descuento, 0);
    expect(sumaLineas).toBeCloseTo(800, 2); // precio_oferta del combo, no el de lista (1000)
  });

  it('el 2x1 propio del combo se aplica antes de repartir entre los componentes', async () => {
    const combo = producto({ id: 'combo-1', precio: 1000, es_2x1: true, es_combo: true });
    encontrarPorId.mockResolvedValue(combo);
    encontrarPorComboId.mockResolvedValue([
      comboItem({ producto_id: 'comp-1', cantidad: 1, producto: producto({ id: 'comp-1', precio: 700 }) }),
      comboItem({ producto_id: 'comp-2', cantidad: 1, producto: producto({ id: 'comp-2', precio: 300 }) }),
    ]);

    // 2 combos pedidos, 2x1 => 1 par => 1 sale gratis => se paga 1 solo combo
    const resultado = await resolverItemsCarrito([{ producto_id: 'combo-1', cantidad: 2 }]);

    const sumaLineas = resultado.itemsConfirmados.reduce((s, i) => s + i.precio_unitario * i.cantidad - i.descuento, 0);
    expect(sumaLineas).toBeCloseTo(1000, 2);
  });
});

function productoImportacion(overrides: Partial<ProductoParaImportacion> = {}): ProductoParaImportacion {
  return {
    id: 'prod-1',
    nombre: 'Producto',
    codigo_barras: '7791',
    precio: 100,
    en_oferta: false,
    precio_oferta: null,
    porcentaje_oferta: null,
    es_2x1: false,
    ...overrides,
  };
}

function csvPrecios(...filas: string[]): Buffer {
  return Buffer.from(['producto;codbarraprinc;precio;neto;precioPublico', ...filas].join('\r\n'), 'utf-8');
}

describe('previewImportarPrecios', () => {
  it('separa coincidencias con cambio, sin cambio y sin coincidencia contra el CSV', async () => {
    listarParaImportacion.mockResolvedValue([
      productoImportacion({ id: 'a', nombre: 'Prod A', codigo_barras: '7791', precio: 100 }),
      productoImportacion({ id: 'b', nombre: 'Prod B', codigo_barras: '7792', precio: 200 }),
      productoImportacion({ id: 'c', nombre: 'Prod C', codigo_barras: '7793', precio: 300 }),
      productoImportacion({ id: 'd', nombre: 'Prod D', codigo_barras: null, precio: 400 }),
    ]);

    const r = await previewImportarPrecios(csvPrecios(
      'Prod A;7791;1;1;150',
      'Prod B;7792;1;1;200',
      'Solo en el CSV;9999;1;1;50',
    ));

    expect(r.coincidencias).toEqual([
      expect.objectContaining({ producto_id: 'a', codigo_barras: '7791', precio_actual: 100, precio_nuevo: 150 }),
    ]);
    expect(r.sin_coincidencia).toEqual([
      expect.objectContaining({ producto_id: 'c', motivo: 'no_esta_en_csv' }),
      expect.objectContaining({ producto_id: 'd', motivo: 'sin_codigo', codigo_barras: null }),
    ]);
    expect(r.resumen).toMatchObject({
      filas_csv: 3,
      con_cambio: 1,
      sin_cambio: 1,
      solo_en_csv: 1,
      sin_coincidencia: 2,
      duplicados_ambiguos: 0,
    });
  });

  it('no propone cambio si el precio solo difiere por decimales de la base', async () => {
    listarParaImportacion.mockResolvedValue([productoImportacion({ precio: 100.004 })]);

    const r = await previewImportarPrecios(csvPrecios('Producto;7791;1;1;100'));

    expect(r.coincidencias).toEqual([]);
    expect(r.resumen.sin_cambio).toBe(1);
  });

  it('compara los códigos sin ceros a la izquierda', async () => {
    listarParaImportacion.mockResolvedValue([productoImportacion({ codigo_barras: '0012345', precio: 100 })]);

    const r = await previewImportarPrecios(csvPrecios('Producto;12345;1;1;150'));

    expect(r.coincidencias).toHaveLength(1);
    expect(r.sin_coincidencia).toEqual([]);
  });

  it('trae el nuevo precio de oferta manteniendo el % de descuento', async () => {
    listarParaImportacion.mockResolvedValue([
      productoImportacion({ precio: 1000, en_oferta: true, precio_oferta: 800, porcentaje_oferta: 20 }),
    ]);

    const r = await previewImportarPrecios(csvPrecios('Producto;7791;1;1;2000'));

    expect(r.coincidencias[0]).toMatchObject({ en_oferta: true, precio_oferta_actual: 800, precio_oferta_nuevo: 1600 });
  });

  it('marca "nombre distinto" solo si el nombre del CSV no se parece al del sistema', async () => {
    listarParaImportacion.mockResolvedValue([
      productoImportacion({ id: 'a', nombre: 'Aspirina 500 x 10', codigo_barras: '7791' }),
      productoImportacion({ id: 'b', nombre: 'Treginax 100 mg cpr x 30', codigo_barras: '7792' }),
    ]);

    const r = await previewImportarPrecios(csvPrecios(
      'IBUPIRAC 400 X 20;7791;1;1;150',
      'TREGINAX 100 MG COMPRIMIDOS X 30;7792;1;1;150',
    ));

    const porId = Object.fromEntries(r.coincidencias.map(c => [c.producto_id, c.nombre_distinto]));
    expect(porId).toEqual({ a: true, b: false });
  });

  it('manda a sin coincidencia un código repetido en el CSV con precios distintos', async () => {
    listarParaImportacion.mockResolvedValue([productoImportacion({ codigo_barras: '7795' })]);

    const r = await previewImportarPrecios(csvPrecios(
      'APIDRA;7795;1;1;573076',
      'APIDRA INST;7795;1;1;453569,92',
    ));

    expect(r.coincidencias).toEqual([]);
    expect(r.sin_coincidencia).toEqual([
      expect.objectContaining({ motivo: 'duplicado_en_csv', precios_csv: [573076, 453569.92] }),
    ]);
    expect(r.resumen).toMatchObject({ duplicados_ambiguos: 1, solo_en_csv: 0 });
  });
});

describe('aplicarCambiosPrecio', () => {
  it('actualiza solo el precio de un producto sin oferta', async () => {
    encontrarPreciosPorIds.mockResolvedValue(new Map([['id-1', productoImportacion({ id: 'id-1' })]]));
    actualizarPrecioYOferta.mockResolvedValue(true);

    const r = await aplicarCambiosPrecio([{ producto_id: 'id-1', precio_nuevo: 150 }]);

    expect(r).toEqual({ actualizados: 1, fallidos: [] });
    expect(actualizarPrecioYOferta).toHaveBeenCalledWith('id-1', { precio: 150 });
  });

  it('recalcula el precio de oferta manteniendo el % en la misma actualización', async () => {
    encontrarPreciosPorIds.mockResolvedValue(new Map([[
      'id-1',
      productoImportacion({ id: 'id-1', precio: 1000, en_oferta: true, precio_oferta: 800, porcentaje_oferta: 20 }),
    ]]));
    actualizarPrecioYOferta.mockResolvedValue(true);

    await aplicarCambiosPrecio([{ producto_id: 'id-1', precio_nuevo: 2000 }]);

    expect(actualizarPrecioYOferta).toHaveBeenCalledWith('id-1', { precio: 2000, precio_oferta: 1600 });
  });

  it('un producto que ya no existe va a fallidos sin frenar a los demás', async () => {
    encontrarPreciosPorIds.mockResolvedValue(new Map([['id-1', productoImportacion({ id: 'id-1' })]]));
    actualizarPrecioYOferta.mockResolvedValue(true);

    const r = await aplicarCambiosPrecio([
      { producto_id: 'id-x', precio_nuevo: 50 },
      { producto_id: 'id-1', precio_nuevo: 150 },
    ]);

    expect(r.actualizados).toBe(1);
    expect(r.fallidos).toEqual([{ producto_id: 'id-x', razon: 'Producto no encontrado' }]);
    expect(actualizarPrecioYOferta).toHaveBeenCalledTimes(1);
  });

  it('informa el error de la base de un item sin frenar a los demás', async () => {
    encontrarPreciosPorIds.mockResolvedValue(new Map([
      ['id-1', productoImportacion({ id: 'id-1' })],
      ['id-2', productoImportacion({ id: 'id-2' })],
      ['id-3', productoImportacion({ id: 'id-3' })],
    ]));
    actualizarPrecioYOferta.mockImplementation(async (id: string) => {
      if (id === 'id-1') return false;
      if (id === 'id-2') throw new Error('caída de la base');
      return true;
    });

    const r = await aplicarCambiosPrecio([
      { producto_id: 'id-1', precio_nuevo: 10 },
      { producto_id: 'id-2', precio_nuevo: 20 },
      { producto_id: 'id-3', precio_nuevo: 30 },
    ]);

    expect(r.actualizados).toBe(1);
    expect(r.fallidos).toEqual(expect.arrayContaining([
      { producto_id: 'id-1', razon: 'No se pudo actualizar' },
      { producto_id: 'id-2', razon: 'Error de base de datos' },
    ]));
    expect(r.fallidos).toHaveLength(2);
  });

  it('si el mismo producto viene dos veces, gana el último precio', async () => {
    encontrarPreciosPorIds.mockResolvedValue(new Map([['id-1', productoImportacion({ id: 'id-1' })]]));
    actualizarPrecioYOferta.mockResolvedValue(true);

    await aplicarCambiosPrecio([
      { producto_id: 'id-1', precio_nuevo: 10 },
      { producto_id: 'id-1', precio_nuevo: 20 },
    ]);

    expect(actualizarPrecioYOferta).toHaveBeenCalledTimes(1);
    expect(actualizarPrecioYOferta).toHaveBeenCalledWith('id-1', { precio: 20 });
  });

  it('no toca la base con una lista vacía', async () => {
    const r = await aplicarCambiosPrecio([]);

    expect(r).toEqual({ actualizados: 0, fallidos: [] });
    expect(encontrarPreciosPorIds).not.toHaveBeenCalled();
  });

  it('rechaza más de 1000 items', async () => {
    const items = Array.from({ length: 1001 }, (_, i) => ({ producto_id: `id-${i}`, precio_nuevo: 10 }));

    await expect(aplicarCambiosPrecio(items)).rejects.toMatchObject({ code: 'ITEMS_LIMIT_EXCEEDED' });
    expect(encontrarPreciosPorIds).not.toHaveBeenCalled();
  });

  it('rechaza un precio en cero o negativo', async () => {
    await expect(aplicarCambiosPrecio([{ producto_id: 'id-1', precio_nuevo: 0 }]))
      .rejects.toMatchObject({ code: 'PRODUCTO_PRECIO_INVALIDO' });
    await expect(aplicarCambiosPrecio([{ producto_id: 'id-1', precio_nuevo: -5 }]))
      .rejects.toMatchObject({ code: 'PRODUCTO_PRECIO_INVALIDO' });
    expect(actualizarPrecioYOferta).not.toHaveBeenCalled();
  });
});
