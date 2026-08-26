import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Producto, Pedido, CrearPedidoDTO } from '../types';

const { encontrarPorId } = vi.hoisted(() => ({
  encontrarPorId: vi.fn(),
}));

const { crearPedido, pedidosEncontrarPorId, cancelarCliente, cancelarSinRestricciones } = vi.hoisted(() => ({
  crearPedido: vi.fn(),
  pedidosEncontrarPorId: vi.fn(),
  cancelarCliente: vi.fn(),
  cancelarSinRestricciones: vi.fn(),
}));
const { registrarHistorial } = vi.hoisted(() => ({ registrarHistorial: vi.fn() }));

vi.mock('../repositories/productos.repository', () => ({ encontrarPorId }));
vi.mock('../repositories/pedidos.repository', () => ({
  crear:                     crearPedido,
  encontrarPorId:            pedidosEncontrarPorId,
  cancelar:                  cancelarCliente,
  cancelarSinRestricciones:  cancelarSinRestricciones,
}));
vi.mock('../repositories/pedidoHistorial.repository', () => ({ registrar: registrarHistorial }));

import { crear, obtenerPorId, cancelar, cancelarPedido } from './pedidos.service';

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
    ...overrides,
  };
}

function dto(overrides: Partial<CrearPedidoDTO> = {}): CrearPedidoDTO {
  return {
    items: [{
      producto_id:     'prod-1',
      nombre_producto: 'Nombre adulterado',
      cantidad:        2,
      precio_unitario: 1,
      precio_lista:    1,
    }],
    metodo_envio: 'retiro_farmacia',
    costo_envio:  0,
    metodo_pago:  'tarjeta',
    ...overrides,
  };
}

function pedidoFixture(): Pedido {
  return {
    id: 'pedido-1',
    user_id: 'user-1',
    estado: 'PendienteDePago',
    total: 0,
    subtotal_lista: 0,
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
    cuotas: 1,
    recargo_financiero: 0,
    puntos_ganados: 0,
    detalles: [],
  };
}

beforeEach(() => {
  encontrarPorId.mockReset();
  crearPedido.mockReset();
  crearPedido.mockResolvedValue(pedidoFixture());
  pedidosEncontrarPorId.mockReset();
  cancelarCliente.mockReset();
  cancelarSinRestricciones.mockReset();
  registrarHistorial.mockReset();
});

describe('crear', () => {
  it('ignora precio_unitario/precio_lista/nombre_producto del cliente y usa el catálogo', async () => {
    encontrarPorId.mockResolvedValue(producto({ precio: 500 }));

    await crear('user-1', dto());

    expect(crearPedido).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
      [{
        producto_id:     'prod-1',
        nombre_producto: 'Producto real',
        cantidad:        2,
        precio_unitario: 500,
        precio_lista:    500,
        descuento:       0,
      }],
      1000, // total: 500 * 2, no 1 * 2 como mandó el cliente
      1000, // subtotal_lista
      undefined, // sin cupón
      0,
      1, // cuotas
      0, // recargo_financiero
    );
  });

  it('usa precio_oferta como precio_unitario cuando el producto está en oferta, pero precio_lista sigue siendo el de lista', async () => {
    encontrarPorId.mockResolvedValue(producto({ precio: 500, en_oferta: true, precio_oferta: 400 }));

    await crear('user-1', dto());

    expect(crearPedido).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
      [expect.objectContaining({ precio_unitario: 400, precio_lista: 500 })],
      800,
      1000,
      undefined,
      0,
      1,
      0,
    );
  });

  it('2x1: con cantidad par, descuenta el precio de una unidad por cada par', async () => {
    encontrarPorId.mockResolvedValue(producto({ precio: 500, es_2x1: true }));

    await crear('user-1', dto({ items: [{ producto_id: 'prod-1', nombre_producto: 'x', cantidad: 2, precio_unitario: 1, precio_lista: 1 }] }));

    expect(crearPedido).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
      [expect.objectContaining({ precio_unitario: 500, precio_lista: 500, descuento: 500 })],
      500, // total: 2 unidades, 1 par, se paga 1 sola
      1000,
      undefined,
      0,
      1,
      0,
    );
  });

  it('2x1: con cantidad impar, la unidad suelta se cobra completa', async () => {
    encontrarPorId.mockResolvedValue(producto({ precio: 500, es_2x1: true }));

    await crear('user-1', dto({ items: [{ producto_id: 'prod-1', nombre_producto: 'x', cantidad: 3, precio_unitario: 1, precio_lista: 1 }] }));

    expect(crearPedido).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
      [expect.objectContaining({ descuento: 500 })],
      1000, // total: 3 unidades = 1500, 1 par de descuento (500) = 1000
      1500,
      undefined,
      0,
      1,
      0,
    );
  });

  it('rechaza el pedido si el stock del catálogo es insuficiente, sin importar lo que diga el cliente', async () => {
    encontrarPorId.mockResolvedValue(producto({ stock: 1 }));

    await expect(crear('user-1', dto())).rejects.toMatchObject({ statusCode: 400 });
    expect(crearPedido).not.toHaveBeenCalled();
  });

  it('rechaza el pedido si el producto no existe', async () => {
    encontrarPorId.mockResolvedValue(null);

    await expect(crear('user-1', dto())).rejects.toMatchObject({ statusCode: 404 });
    expect(crearPedido).not.toHaveBeenCalled();
  });

  it('rechaza un pedido sin items', async () => {
    await expect(crear('user-1', dto({ items: [] }))).rejects.toMatchObject({ statusCode: 400 });
    expect(encontrarPorId).not.toHaveBeenCalled();
  });

  it('rechaza destinatario_dni con formato inválido cuando el envío es a domicilio', async () => {
    await expect(crear('user-1', dto({
      metodo_envio: 'domicilio',
      destinatario_nombre: 'Juan Pérez',
      destinatario_dni: 'no-es-un-dni',
    }))).rejects.toMatchObject({ statusCode: 400 });
    expect(crearPedido).not.toHaveBeenCalled();
  });

  it('acepta destinatario_dni válido cuando el envío es a domicilio', async () => {
    encontrarPorId.mockResolvedValue(producto());

    await crear('user-1', dto({
      metodo_envio: 'domicilio',
      destinatario_nombre: 'Juan Pérez',
      destinatario_dni: '30111222',
    }));

    expect(crearPedido).toHaveBeenCalled();
  });

  it('pasa cantidad/producto_id confirmados (no los del DTO) a pedidosRepo.crear, que descuenta stock atómicamente', async () => {
    encontrarPorId.mockResolvedValue(producto());

    await crear('user-1', dto());

    expect(crearPedido).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
      [expect.objectContaining({ producto_id: 'prod-1', cantidad: 2 })],
      expect.any(Number),
      expect.any(Number),
      undefined,
      0,
      1,
      0,
    );
  });

  it('calcula el recargo financiero sobre productos + envío cuando el pedido es en cuotas', async () => {
    encontrarPorId.mockResolvedValue(producto({ precio: 500 }));

    // total productos = 1000 (2 * 500), + costo_envio 200 = 1200 base
    // coeficiente 3 cuotas = 1.2123 -> recargo = 1200 * 0.2123 = 254.76
    await crear('user-1', dto({ costo_envio: 200, cuotas: 3 }));

    expect(crearPedido).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
      expect.anything(),
      1000,
      1000,
      undefined,
      0,
      3,
      254.76,
    );
  });

  it('fuerza cuotas=1 y recargo=0 cuando el método de pago no es tarjeta, sin importar lo que mande el cliente', async () => {
    encontrarPorId.mockResolvedValue(producto({ precio: 500 }));

    await crear('user-1', dto({ metodo_pago: 'transferencia', cuotas: 6 }));

    expect(crearPedido).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
      expect.anything(),
      1000,
      1000,
      undefined,
      0,
      1,
      0,
    );
  });

  it('rechaza una cantidad de cuotas inválida', async () => {
    encontrarPorId.mockResolvedValue(producto({ precio: 500 }));

    await expect(crear('user-1', dto({ cuotas: 4 }))).rejects.toMatchObject({
      statusCode: 400,
      code: 'CUOTAS_INVALIDAS',
    });
    expect(crearPedido).not.toHaveBeenCalled();
  });
});

describe('obtenerPorId', () => {
  it('rechaza con 403 cuando el pedido pertenece a otro usuario', async () => {
    pedidosEncontrarPorId.mockResolvedValue({ ...pedidoFixture(), user_id: 'user-1' });

    await expect(obtenerPorId('11111111-1111-1111-1111-111111111111', 'user-2'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('rechaza con 404 cuando el pedido no existe', async () => {
    pedidosEncontrarPorId.mockResolvedValue(null);

    await expect(obtenerPorId('11111111-1111-1111-1111-111111111111', 'user-1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('devuelve el pedido cuando el dueño coincide', async () => {
    pedidosEncontrarPorId.mockResolvedValue({ ...pedidoFixture(), user_id: 'user-1' });

    const pedido = await obtenerPorId('11111111-1111-1111-1111-111111111111', 'user-1');

    expect(pedido.user_id).toBe('user-1');
  });
});

describe('cancelar (cliente)', () => {
  const ID = '11111111-1111-1111-1111-111111111111';

  it('rechaza si el pedido no está en PendienteDePago', async () => {
    pedidosEncontrarPorId.mockResolvedValue({ ...pedidoFixture(), user_id: 'user-1', estado: 'Confirmado' });

    await expect(cancelar(ID, 'user-1')).rejects.toMatchObject({ statusCode: 400 });
    expect(cancelarCliente).not.toHaveBeenCalled();
  });

  it('llama a pedidosRepo.cancelar (que restaura stock atómicamente) cuando está en PendienteDePago', async () => {
    pedidosEncontrarPorId.mockResolvedValue({ ...pedidoFixture(), user_id: 'user-1', estado: 'PendienteDePago' });
    cancelarCliente.mockResolvedValue({ ...pedidoFixture(), estado: 'Cancelado' });

    await cancelar(ID, 'user-1');

    expect(cancelarCliente).toHaveBeenCalledWith(ID, 'user-1', 'solicitado_por_cliente');
  });
});

describe('cancelarPedido (admin)', () => {
  const ID = '11111111-1111-1111-1111-111111111111';

  it('rechaza un motivo inválido', async () => {
    await expect(cancelarPedido(ID, 'motivo-inventado', 'admin-1')).rejects.toMatchObject({ statusCode: 400 });
    expect(cancelarSinRestricciones).not.toHaveBeenCalled();
  });

  it('rechaza si el pedido ya está en un estado final', async () => {
    pedidosEncontrarPorId.mockResolvedValue({ ...pedidoFixture(), estado: 'Entregado' });

    await expect(cancelarPedido(ID, 'sin_stock', 'admin-1')).rejects.toMatchObject({ statusCode: 400 });
    expect(cancelarSinRestricciones).not.toHaveBeenCalled();
  });

  it('llama a pedidosRepo.cancelarSinRestricciones (que restaura stock atómicamente) y registra el historial', async () => {
    pedidosEncontrarPorId.mockResolvedValue({ ...pedidoFixture(), estado: 'EnPreparacion' });
    cancelarSinRestricciones.mockResolvedValue({ ...pedidoFixture(), estado: 'Cancelado' });

    await cancelarPedido(ID, 'sin_stock', 'admin-1');

    expect(cancelarSinRestricciones).toHaveBeenCalledWith(ID, 'sin_stock');
    expect(registrarHistorial).toHaveBeenCalledWith(expect.objectContaining({
      pedido_id: ID,
      estado_anterior: 'EnPreparacion',
      estado_nuevo: 'Cancelado',
      motivo: 'sin_stock',
      changed_by: 'admin-1',
    }));
  });
});
