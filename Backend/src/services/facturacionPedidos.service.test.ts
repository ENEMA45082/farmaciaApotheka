import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pedido, Perfil, Factura } from '../types';

const {
  obtenerClienteArca,
  encontrarPorPedidoId,
  crear,
  actualizar,
  encontrarOCrear,
  createNextVoucher,
} = vi.hoisted(() => ({
  obtenerClienteArca: vi.fn(),
  encontrarPorPedidoId: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  encontrarOCrear: vi.fn(),
  createNextVoucher: vi.fn(),
}));

vi.mock('../config/afipEnvironment', () => ({ obtenerClienteArca }));
vi.mock('../config/supabase', () => ({ supabase: { auth: { admin: { getUserById: vi.fn() } }, storage: { from: vi.fn() } } }));
vi.mock('../repositories/facturas.repository', () => ({ encontrarPorPedidoId, crear, actualizar }));
vi.mock('../repositories/perfil.repository', () => ({ encontrarOCrear }));
vi.mock('../repositories/direcciones.repository', () => ({ obtener: vi.fn() }));

import { emitirFactura } from './facturacionPedidos.service';

function pedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: 'pedido-1',
    user_id: 'user-1',
    estado: 'Entregado',
    total: 121,
    subtotal_lista: 121,
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
    ...overrides,
  };
}

function perfil(overrides: Partial<Perfil> = {}): Perfil {
  return {
    user_id: 'user-1',
    nombre: 'Ema',
    apellido: 'Tejeda',
    dni: null,
    documento_tipo: 'DNI',
    genero: null,
    fecha_nacimiento: null,
    telefono: null,
    foto_url: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function facturaPendiente(): Factura {
  return {
    id: 'factura-1',
    pedido_id: 'pedido-1',
    estado: 'pendiente',
    tipo_comprobante: null,
    punto_venta: null,
    nro_comprobante: null,
    cae: null,
    cae_vencimiento: null,
    importe_total: null,
    respuesta_error: null,
    intentos: 0,
    pdf_url: null,
    receptor_doc_tipo: null,
    receptor_doc_nro: null,
    creado_en: '2026-07-11T00:00:00.000Z',
    actualizado_en: '2026-07-11T00:00:00.000Z',
  };
}

const afipStub = { ElectronicBilling: { createNextVoucher, createPDF: vi.fn() } };

beforeEach(() => {
  obtenerClienteArca.mockReset();
  encontrarPorPedidoId.mockReset();
  crear.mockReset();
  actualizar.mockReset();
  encontrarOCrear.mockReset();
  createNextVoucher.mockReset();

  encontrarPorPedidoId.mockResolvedValue(null);
  crear.mockResolvedValue(facturaPendiente());
});

describe('emitirFactura', () => {
  it('no hace nada si ARCA no está configurado en el ambiente activo', async () => {
    obtenerClienteArca.mockReturnValue({ ambiente: 'homologacion', afip: null, configurado: false, puntoVenta: 1, cuit: undefined });

    await emitirFactura(pedido());

    expect(crear).not.toHaveBeenCalled();
    expect(createNextVoucher).not.toHaveBeenCalled();
  });

  it('no vuelve a facturar si ya existe una factura emitida (idempotencia)', async () => {
    obtenerClienteArca.mockReturnValue({ ambiente: 'homologacion', afip: afipStub, configurado: true, puntoVenta: 1, cuit: '20450823350' });
    encontrarPorPedidoId.mockResolvedValue({ ...facturaPendiente(), estado: 'emitida', pdf_url: 'https://algo.pdf' });

    await emitirFactura(pedido());

    expect(createNextVoucher).not.toHaveBeenCalled();
  });

  it('marca la factura en error, sin llamar a ARCA, si el perfil no tiene DNI/CUIT cargado', async () => {
    obtenerClienteArca.mockReturnValue({ ambiente: 'homologacion', afip: afipStub, configurado: true, puntoVenta: 1, cuit: '20450823350' });
    encontrarOCrear.mockResolvedValue(perfil({ dni: null }));

    await emitirFactura(pedido());

    expect(createNextVoucher).not.toHaveBeenCalled();
    expect(actualizar).toHaveBeenCalledWith('factura-1', expect.objectContaining({
      estado: 'error',
      respuesta_error: 'Falta DNI/CUIT del comprador en su perfil',
      incrementarIntentos: true,
    }));
  });

  it('usa el punto de venta resuelto por obtenerClienteArca y el DocTipo correcto para CUIT', async () => {
    obtenerClienteArca.mockReturnValue({ ambiente: 'produccion', afip: afipStub, configurado: true, puntoVenta: 6, cuit: '30677539743' });
    encontrarOCrear.mockResolvedValue(perfil({ dni: '30712345678', documento_tipo: 'CUIT' }));
    createNextVoucher.mockResolvedValue({ CAE: '123', CAEFchVto: '2026-08-01', voucherNumber: 1 });
    actualizar.mockResolvedValue({ ...facturaPendiente(), estado: 'emitida' });

    await emitirFactura(pedido());

    expect(createNextVoucher).toHaveBeenCalledWith(expect.objectContaining({
      PtoVta: 6,
      DocTipo: 80, // CUIT
      DocNro: 30712345678,
    }));
    expect(actualizar).toHaveBeenCalledWith('factura-1', expect.objectContaining({
      estado: 'emitida',
      punto_venta: 6,
      receptor_doc_tipo: 80,
      receptor_doc_nro: 30712345678,
    }));
  });
});
