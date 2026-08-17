import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Cupon, ItemPedidoConfirmado } from '../types';

const { encontrarPorCodigo, contarUsosTotal, contarUsosPorCliente } = vi.hoisted(() => ({
  encontrarPorCodigo: vi.fn(),
  contarUsosTotal: vi.fn(),
  contarUsosPorCliente: vi.fn(),
}));

const { resolverItemsCarrito } = vi.hoisted(() => ({
  resolverItemsCarrito: vi.fn(),
}));

vi.mock('../repositories/cupones.repository', () => ({
  encontrarPorCodigo,
  contarUsosTotal,
  contarUsosPorCliente,
}));
vi.mock('./productos.service', () => ({ resolverItemsCarrito }));

import { validarCupon } from './cupones.service';

function cupon(overrides: Partial<Cupon> = {}): Cupon {
  return {
    id: 'cupon-1',
    codigo: 'DESCUENTO10',
    tipo: 'porcentaje',
    valor: 10,
    compra_minima: 0,
    descuento_maximo: null,
    limite_usos_total: null,
    limite_usos_por_cliente: null,
    valido_desde: null,
    valido_hasta: null,
    activo: true,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function item(overrides: Partial<ItemPedidoConfirmado> = {}): ItemPedidoConfirmado {
  return {
    producto_id: 'prod-1',
    nombre_producto: 'Producto',
    cantidad: 1,
    precio_unitario: 1000,
    precio_lista: 1000,
    descuento: 0,
    ...overrides,
  };
}

const inputBase = { codigo: 'descuento10', clienteId: 'cliente-1', itemsCarrito: [{ producto_id: 'prod-1', cantidad: 1 }] };

beforeEach(() => {
  encontrarPorCodigo.mockReset();
  contarUsosTotal.mockReset();
  contarUsosPorCliente.mockReset();
  resolverItemsCarrito.mockReset();
  resolverItemsCarrito.mockResolvedValue({ itemsConfirmados: [item()], total: 1000, subtotalLista: 1000, productos: new Map() });
});

describe('validarCupon', () => {
  it('normaliza el código a mayúsculas sin espacios antes de buscarlo', async () => {
    encontrarPorCodigo.mockResolvedValue(null);
    await validarCupon({ ...inputBase, codigo: '  descuento10  ' });
    expect(encontrarPorCodigo).toHaveBeenCalledWith('DESCUENTO10');
  });

  it('CODIGO_INEXISTENTE si no existe el cupón', async () => {
    encontrarPorCodigo.mockResolvedValue(null);
    const resultado = await validarCupon(inputBase);
    expect(resultado).toMatchObject({ valido: false, motivo: 'CODIGO_INEXISTENTE' });
  });

  it('INACTIVO si el cupón está pausado', async () => {
    encontrarPorCodigo.mockResolvedValue(cupon({ activo: false }));
    const resultado = await validarCupon(inputBase);
    expect(resultado).toMatchObject({ valido: false, motivo: 'INACTIVO' });
  });

  it('AUN_NO_VIGENTE si todavía no llegó valido_desde', async () => {
    encontrarPorCodigo.mockResolvedValue(cupon({ valido_desde: '2099-01-01T00:00:00.000Z' }));
    const resultado = await validarCupon(inputBase);
    expect(resultado).toMatchObject({ valido: false, motivo: 'AUN_NO_VIGENTE' });
  });

  it('VENCIDO si ya pasó valido_hasta', async () => {
    encontrarPorCodigo.mockResolvedValue(cupon({ valido_hasta: '2020-01-01T00:00:00.000Z' }));
    const resultado = await validarCupon(inputBase);
    expect(resultado).toMatchObject({ valido: false, motivo: 'VENCIDO' });
  });

  it('LIMITE_USOS_ALCANZADO si los canjes totales llegaron al límite', async () => {
    encontrarPorCodigo.mockResolvedValue(cupon({ limite_usos_total: 5 }));
    contarUsosTotal.mockResolvedValue(5);
    const resultado = await validarCupon(inputBase);
    expect(resultado).toMatchObject({ valido: false, motivo: 'LIMITE_USOS_ALCANZADO' });
  });

  it('LIMITE_CLIENTE_ALCANZADO si este cliente ya usó el cupón el máximo de veces', async () => {
    encontrarPorCodigo.mockResolvedValue(cupon({ limite_usos_por_cliente: 1 }));
    contarUsosPorCliente.mockResolvedValue(1);
    const resultado = await validarCupon(inputBase);
    expect(resultado).toMatchObject({ valido: false, motivo: 'LIMITE_CLIENTE_ALCANZADO' });
  });

  it('COMPRA_MINIMA_NO_ALCANZADA si el carrito no llega al mínimo', async () => {
    encontrarPorCodigo.mockResolvedValue(cupon({ compra_minima: 5000 }));
    resolverItemsCarrito.mockResolvedValue({ itemsConfirmados: [item({ precio_unitario: 1000 })], total: 1000, subtotalLista: 1000, productos: new Map() });
    const resultado = await validarCupon(inputBase);
    expect(resultado).toMatchObject({ valido: false, motivo: 'COMPRA_MINIMA_NO_ALCANZADA', montoElegible: 1000 });
  });

  it('calcula el descuento porcentaje sobre el monto elegible', async () => {
    encontrarPorCodigo.mockResolvedValue(cupon({ tipo: 'porcentaje', valor: 20 }));
    resolverItemsCarrito.mockResolvedValue({ itemsConfirmados: [item({ precio_unitario: 1000, cantidad: 2 })], total: 2000, subtotalLista: 2000, productos: new Map() });
    const resultado = await validarCupon(inputBase);
    expect(resultado).toMatchObject({ valido: true, descuento: 400, montoElegible: 2000, cuponId: 'cupon-1' });
  });

  it('tope descuento_maximo limita el descuento porcentaje', async () => {
    encontrarPorCodigo.mockResolvedValue(cupon({ tipo: 'porcentaje', valor: 50, descuento_maximo: 300 }));
    resolverItemsCarrito.mockResolvedValue({ itemsConfirmados: [item({ precio_unitario: 1000, cantidad: 2 })], total: 2000, subtotalLista: 2000, productos: new Map() });
    const resultado = await validarCupon(inputBase);
    expect(resultado.descuento).toBe(300);
  });

  it('cupón fijo nunca descuenta más que el monto elegible', async () => {
    encontrarPorCodigo.mockResolvedValue(cupon({ tipo: 'fijo', valor: 5000 }));
    resolverItemsCarrito.mockResolvedValue({ itemsConfirmados: [item({ precio_unitario: 1000 })], total: 1000, subtotalLista: 1000, productos: new Map() });
    const resultado = await validarCupon(inputBase);
    expect(resultado).toMatchObject({ valido: true, descuento: 1000 });
  });

  it('cupón fijo descuenta el valor completo si el elegible alcanza', async () => {
    encontrarPorCodigo.mockResolvedValue(cupon({ tipo: 'fijo', valor: 300 }));
    resolverItemsCarrito.mockResolvedValue({ itemsConfirmados: [item({ precio_unitario: 1000 })], total: 1000, subtotalLista: 1000, productos: new Map() });
    const resultado = await validarCupon(inputBase);
    expect(resultado).toMatchObject({ valido: true, descuento: 300 });
  });
});
