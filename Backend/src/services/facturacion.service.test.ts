import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pedido, DetallePedido, Producto } from '../types';

const { encontrarPorId } = vi.hoisted(() => ({ encontrarPorId: vi.fn() }));

vi.mock('../repositories/productos.repository', () => ({ encontrarPorId }));
vi.mock('../config/afip', () => ({ afip: null, afipConfigurado: false, PUNTO_VENTA_ARCA: 1 }));

import { calcularDesgloseIva } from './facturacion.service';

function detalle(overrides: Partial<DetallePedido>): DetallePedido {
  return {
    id: 'det-1',
    pedido_id: 'pedido-1',
    producto_id: 'prod-1',
    nombre_producto: 'Producto',
    cantidad: 1,
    precio_unitario: 121,
    precio_lista: 121,
    subtotal: 121,
    ...overrides,
  };
}

function pedido(detalles: DetallePedido[]): Pedido {
  return {
    id: 'pedido-1',
    user_id: 'user-1',
    estado: 'Confirmado',
    total: detalles.reduce((s, d) => s + d.subtotal, 0),
    subtotal_lista: 0,
    nro_pedido: 1,
    notas: null,
    metodo_envio: 'retiro_farmacia',
    costo_envio: 0,
    sucursal_correo_argentino: null,
    codigo_postal_envio: null,
    metodo_pago: 'tarjeta',
    pw_payment_id: null,
    pw_site_transaction_id: null,
    fecha_pedido: '2026-07-11T00:00:00.000Z',
    fecha_cancelacion: null,
    motivo_cancelacion: null,
    creado_en: '2026-07-11T00:00:00.000Z',
    shipping_tracking_number: null,
    shipping_fecha_envio: null,
    shipping_creado_en_correo: null,
    shipping_error: null,
    destinatario_nombre: null,
    destinatario_dni: null,
    destinatario_cod_area: null,
    destinatario_telefono: null,
    detalles,
  };
}

function producto(alicuota_iva: number): Producto {
  return {
    id: 'prod-1',
    nombre: 'Producto',
    descripcion: null,
    precio: 100,
    en_oferta: false,
    precio_oferta: null,
    porcentaje_oferta: null,
    imagen_url: null,
    categoria_id: null,
    stock: 10,
    codigo_barras: null,
    fecha_vencimiento: null,
    imagenes: [],
    creado_en: '2026-01-01T00:00:00.000Z',
    es_venta_libre: true,
    peso_gramos: 500,
    alicuota_iva,
  };
}

beforeEach(() => {
  encontrarPorId.mockReset();
});

describe('calcularDesgloseIva', () => {
  it('calcula el neto y el IVA para un solo producto al 21%', async () => {
    encontrarPorId.mockResolvedValue(producto(21));

    const resultado = await calcularDesgloseIva(pedido([detalle({ subtotal: 121 })]));

    expect(resultado.netoTotal).toBeCloseTo(100, 2);
    expect(resultado.ivaTotal).toBeCloseTo(21, 2);
    expect(resultado.ivaPorAlicuota).toHaveLength(1);
  });

  it('agrupa correctamente productos con distintas alícuotas', async () => {
    encontrarPorId
      .mockResolvedValueOnce(producto(21))
      .mockResolvedValueOnce(producto(10.5));

    const resultado = await calcularDesgloseIva(
      pedido([
        detalle({ id: 'd1', producto_id: 'p1', subtotal: 121 }),
        detalle({ id: 'd2', producto_id: 'p2', subtotal: 110.5 }),
      ]),
    );

    expect(resultado.ivaPorAlicuota).toHaveLength(2);
    expect(resultado.netoTotal).toBeCloseTo(200, 2);
    expect(resultado.ivaTotal).toBeCloseTo(31.5, 2);
  });

  it('usa 21% por default si el producto no existe más (fue borrado)', async () => {
    encontrarPorId.mockResolvedValue(null);

    const resultado = await calcularDesgloseIva(pedido([detalle({ subtotal: 121 })]));

    expect(resultado.netoTotal).toBeCloseTo(100, 2);
    expect(resultado.ivaTotal).toBeCloseTo(21, 2);
  });

  it('usa 21% por default si el detalle no tiene producto_id (venta libre sin vínculo)', async () => {
    const resultado = await calcularDesgloseIva(pedido([detalle({ producto_id: null, subtotal: 121 })]));

    expect(encontrarPorId).not.toHaveBeenCalled();
    expect(resultado.ivaTotal).toBeCloseTo(21, 2);
  });
});
