import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Producto, ComboItem } from '../types';

const { encontrarPorId } = vi.hoisted(() => ({
  encontrarPorId: vi.fn(),
}));
const { encontrarPorComboId } = vi.hoisted(() => ({
  encontrarPorComboId: vi.fn(),
}));

// Mock parcial (solo encontrarPorId) — comboItems.repository.ts importa
// mapearProducto de este módulo, pero ninguno de estos tests hace que se
// invoque de verdad (solo se llama al mapear filas reales de Supabase), así
// que no hace falta mockearlo acá.
vi.mock('../repositories/productos.repository', () => ({ encontrarPorId }));
vi.mock('../repositories/comboItems.repository', () => ({ encontrarPorComboId }));

import { resolverItemsCarrito } from './productos.service';

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
