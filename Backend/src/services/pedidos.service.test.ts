import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Producto, Pedido, CrearPedidoDTO } from '../types';

const { encontrarPorId, descontarStock } = vi.hoisted(() => ({
  encontrarPorId: vi.fn(),
  descontarStock: vi.fn(),
}));

const { crearPedido, pedidosEncontrarPorId } = vi.hoisted(() => ({
  crearPedido: vi.fn(),
  pedidosEncontrarPorId: vi.fn(),
}));

vi.mock('../repositories/productos.repository', () => ({ encontrarPorId, descontarStock }));
vi.mock('../repositories/pedidos.repository', () => ({
  crear:          crearPedido,
  encontrarPorId: pedidosEncontrarPorId,
}));

import { crear, obtenerPorId } from './pedidos.service';

function producto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 'prod-1',
    nombre: 'Producto real',
    descripcion: null,
    precio: 500,
    en_oferta: false,
    precio_oferta: null,
    porcentaje_oferta: null,
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
    detalles: [],
  };
}

beforeEach(() => {
  encontrarPorId.mockReset();
  descontarStock.mockReset();
  crearPedido.mockReset();
  crearPedido.mockResolvedValue(pedidoFixture());
  pedidosEncontrarPorId.mockReset();
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
      }],
      1000, // total: 500 * 2, no 1 * 2 como mandó el cliente
      1000, // subtotal_lista
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

  it('descuenta stock usando cantidad/producto_id confirmados, no los del DTO', async () => {
    encontrarPorId.mockResolvedValue(producto());

    await crear('user-1', dto());

    expect(descontarStock).toHaveBeenCalledWith('prod-1', 2);
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
