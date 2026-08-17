import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pedido, DetallePedido } from '../types';

const { actualizarEstado, cancelarSinRestricciones, encontrarPorId, encontrarPorPwPaymentId } = vi.hoisted(() => ({
  actualizarEstado: vi.fn(),
  cancelarSinRestricciones: vi.fn(),
  encontrarPorId: vi.fn(),
  encontrarPorPwPaymentId: vi.fn(),
}));

vi.mock('../repositories/pedidos.repository', () => ({
  actualizarEstado,
  cancelarSinRestricciones,
  encontrarPorId,
  encontrarPorPwPaymentId,
}));

// NOTA: pagos.service.ts carga sdk-node-payway con require() (no import), y Vitest
// no logra interceptarlo con vi.mock (queda pegando a la red real). Por eso los tests
// de confirmarRetornoCheckout de acá abajo se limitan a los casos que retornan ANTES
// de tocar el SDK (consultarPagosPayway) — cubrir el resto (matching de monto/sitio,
// guarda anti-replay) queda pendiente hasta resolver el mockeo del SDK.
import { aplicarResultadoPago, confirmarRetornoCheckout } from './pagos.service';

function detalle(overrides: Partial<DetallePedido>): DetallePedido {
  return {
    id: 'det-1',
    pedido_id: 'pedido-1',
    producto_id: 'prod-1',
    nombre_producto: 'Producto',
    cantidad: 2,
    precio_unitario: 100,
    precio_lista: 100,
    descuento: 0,
    subtotal: 200,
    ...overrides,
  };
}

function pedido(detalles: DetallePedido[] = [], overrides: Partial<Pedido> = {}): Pedido {
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
    tipo_servicio_envio: null,
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
    cupon_id: null,
    cupon_codigo: null,
    descuento_cupon: 0,
    puntos_ganados: 0,
    detalles,
    ...overrides,
  };
}

beforeEach(() => {
  actualizarEstado.mockReset();
  cancelarSinRestricciones.mockReset();
  encontrarPorId.mockReset();
  encontrarPorPwPaymentId.mockReset();
  encontrarPorPwPaymentId.mockResolvedValue(null);
});

describe('aplicarResultadoPago', () => {
  it('confirma el pedido cuando el pago fue aprobado (la factura se dispara recién al entregar, no acá)', async () => {
    const p = pedido([detalle({})]);

    await aplicarResultadoPago(p, 'approved', 'pw-123');

    expect(actualizarEstado).toHaveBeenCalledWith('pedido-1', 'Confirmado', { pw_payment_id: 'pw-123' });
    expect(cancelarSinRestricciones).not.toHaveBeenCalled();
  });

  it('cancela el pedido cuando el pago fue rechazado (cancelarSinRestricciones restaura el stock atómicamente)', async () => {
    const p = pedido([
      detalle({ id: 'd1', producto_id: 'prod-1', cantidad: 2 }),
      detalle({ id: 'd2', producto_id: 'prod-2', cantidad: 3 }),
    ]);

    await aplicarResultadoPago(p, 'rejected', 'pw-123');

    expect(cancelarSinRestricciones).toHaveBeenCalledWith('pedido-1', 'pago_rechazado');
    expect(actualizarEstado).not.toHaveBeenCalled();
  });

  it('cancela el pedido con motivo "solicitado_por_cliente" cuando Payway informa cancelled', async () => {
    const p = pedido([detalle({})]);

    await aplicarResultadoPago(p, 'cancelled', 'pw-123');

    expect(cancelarSinRestricciones).toHaveBeenCalledWith('pedido-1', 'solicitado_por_cliente');
  });

  it('no hace nada si el status no es un valor reconocido', async () => {
    const p = pedido([detalle({})]);

    await aplicarResultadoPago(p, 'pending', 'pw-123');

    expect(actualizarEstado).not.toHaveBeenCalled();
    expect(cancelarSinRestricciones).not.toHaveBeenCalled();
  });
});

describe('confirmarRetornoCheckout', () => {
  const PEDIDO_ID = '11111111-1111-1111-1111-111111111111';

  it('no confirma si no se pudo extraer site_transaction_id del resultado', async () => {
    encontrarPorId.mockResolvedValue(pedido([], { id: PEDIDO_ID, total: 200 }));

    await confirmarRetornoCheckout(PEDIDO_ID, {});

    expect(actualizarEstado).not.toHaveBeenCalled();
  });

  it('no hace nada si el pedido ya no está en PendienteDePago (evita reprocesar)', async () => {
    encontrarPorId.mockResolvedValue(pedido([], { id: PEDIDO_ID, total: 200, estado: 'Confirmado' }));

    await confirmarRetornoCheckout(PEDIDO_ID, { site_transaction_id: 'CH2107202656e7' });

    expect(actualizarEstado).not.toHaveBeenCalled();
  });

  it('no hace nada si el pedido no existe', async () => {
    encontrarPorId.mockResolvedValue(null);

    await confirmarRetornoCheckout(PEDIDO_ID, { site_transaction_id: 'CH2107202656e7' });

    expect(actualizarEstado).not.toHaveBeenCalled();
  });
});
