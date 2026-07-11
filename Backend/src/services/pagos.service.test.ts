import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pedido, DetallePedido } from '../types';

const { actualizarEstado, restaurarStock, emitirFactura } = vi.hoisted(() => ({
  actualizarEstado: vi.fn(),
  restaurarStock: vi.fn(),
  emitirFactura: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../repositories/pedidos.repository', () => ({ actualizarEstado, encontrarPorId: vi.fn() }));
vi.mock('../repositories/productos.repository', () => ({ restaurarStock }));
vi.mock('./facturacion.service', () => ({ emitirFactura }));

import { aplicarResultadoPago } from './pagos.service';

function detalle(overrides: Partial<DetallePedido>): DetallePedido {
  return {
    id: 'det-1',
    pedido_id: 'pedido-1',
    producto_id: 'prod-1',
    nombre_producto: 'Producto',
    cantidad: 2,
    precio_unitario: 100,
    precio_lista: 100,
    subtotal: 200,
    ...overrides,
  };
}

function pedido(detalles: DetallePedido[] = []): Pedido {
  return {
    id: 'pedido-1',
    user_id: 'user-1',
    estado: 'PendienteDePago',
    total: 200,
    subtotal_lista: 200,
    nro_pedido: 1,
    notas: null,
    metodo_envio: 'retiro_farmacia',
    costo_envio: 0,
    sucursal_correo_argentino: null,
    codigo_postal_envio: null,
    metodo_pago: 'tarjeta',
    pw_payment_id: null,
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

beforeEach(() => {
  actualizarEstado.mockReset();
  restaurarStock.mockReset();
  emitirFactura.mockClear();
});

describe('aplicarResultadoPago', () => {
  it('confirma el pedido y dispara la factura cuando el pago fue aprobado', async () => {
    const p = pedido([detalle({})]);

    await aplicarResultadoPago(p, 'approved', 'pw-123');

    expect(actualizarEstado).toHaveBeenCalledWith('pedido-1', 'Confirmado', { pw_payment_id: 'pw-123' });
    expect(emitirFactura).toHaveBeenCalledWith(p);
    expect(restaurarStock).not.toHaveBeenCalled();
  });

  it('cancela el pedido y restaura el stock de cada detalle cuando el pago fue rechazado', async () => {
    const p = pedido([
      detalle({ id: 'd1', producto_id: 'prod-1', cantidad: 2 }),
      detalle({ id: 'd2', producto_id: 'prod-2', cantidad: 3 }),
    ]);

    await aplicarResultadoPago(p, 'rejected', 'pw-123');

    expect(actualizarEstado).toHaveBeenCalledWith('pedido-1', 'Cancelado', { motivo_cancelacion: 'pago_rechazado' });
    expect(restaurarStock).toHaveBeenCalledWith('prod-1', 2);
    expect(restaurarStock).toHaveBeenCalledWith('prod-2', 3);
    expect(emitirFactura).not.toHaveBeenCalled();
  });

  it('cancela el pedido con motivo "solicitado_por_cliente" cuando Payway informa cancelled', async () => {
    const p = pedido([detalle({})]);

    await aplicarResultadoPago(p, 'cancelled', 'pw-123');

    expect(actualizarEstado).toHaveBeenCalledWith('pedido-1', 'Cancelado', { motivo_cancelacion: 'solicitado_por_cliente' });
  });

  it('no restaura stock de detalles sin producto_id (item eliminado del catálogo)', async () => {
    const p = pedido([detalle({ producto_id: null })]);

    await aplicarResultadoPago(p, 'rejected', 'pw-123');

    expect(restaurarStock).not.toHaveBeenCalled();
  });

  it('no hace nada si el status no es un valor reconocido', async () => {
    const p = pedido([detalle({})]);

    await aplicarResultadoPago(p, 'pending', 'pw-123');

    expect(actualizarEstado).not.toHaveBeenCalled();
    expect(restaurarStock).not.toHaveBeenCalled();
    expect(emitirFactura).not.toHaveBeenCalled();
  });
});
