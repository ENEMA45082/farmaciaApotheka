import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pedido, Premio } from '../types';
import { calcularPuntosPorPedido } from '../config/puntosConfig';

const { acreditarPuntos, crearPremioRepo, actualizarPremioRepo } = vi.hoisted(() => ({
  acreditarPuntos: vi.fn(),
  crearPremioRepo: vi.fn(),
  actualizarPremioRepo: vi.fn(),
}));

const { encontrarPorDniPerfil, crearClienteFisicoRepo } = vi.hoisted(() => ({
  encontrarPorDniPerfil: vi.fn(),
  crearClienteFisicoRepo: vi.fn(),
}));

const { createUser, deleteUser } = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock('../repositories/puntos.repository', () => ({
  acreditarPuntos,
  crearPremio: crearPremioRepo,
  actualizarPremio: actualizarPremioRepo,
}));

vi.mock('../repositories/perfil.repository', () => ({
  encontrarPorDni:    encontrarPorDniPerfil,
  crearClienteFisico: crearClienteFisicoRepo,
}));

vi.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      admin: {
        createUser,
        deleteUser,
        getUserById: vi.fn(),
      },
    },
  },
}));

import { acreditarPorPedido, crearPremio, actualizarPremio, crearClienteFisico } from './puntos.service';

function pedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: 'pedido-1',
    user_id: 'user-1',
    estado: 'Entregado',
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
    ...overrides,
  };
}

function premio(overrides: Partial<Premio> = {}): Premio {
  return {
    id: 'premio-1',
    nombre: 'Termo Apotheka',
    descripcion: null,
    imagen_url: null,
    costo_puntos: 500,
    stock: null,
    activo: true,
    creado_en: '2026-07-11T00:00:00.000Z',
    actualizado_en: '2026-07-11T00:00:00.000Z',
    ...overrides,
  };
}

function clienteFisicoDTO(overrides: Partial<{ nombre: string; apellido: string; dni: string; telefono: string; email: string | null }> = {}) {
  return {
    nombre:   'Juan',
    apellido: 'Pérez',
    dni:      '20-12345678-6', // válido: ver Backend/src/utils/validarDocumento.test.ts
    telefono: '3511234567',
    email:    null,
    ...overrides,
  };
}

beforeEach(() => {
  acreditarPuntos.mockReset();
  crearPremioRepo.mockReset();
  actualizarPremioRepo.mockReset();
  encontrarPorDniPerfil.mockReset();
  encontrarPorDniPerfil.mockResolvedValue([]);
  crearClienteFisicoRepo.mockReset();
  createUser.mockReset();
  deleteUser.mockReset();
  deleteUser.mockResolvedValue({ data: {}, error: null });
});

describe('calcularPuntosPorPedido', () => {
  it('1 punto cada $100, redondeando hacia abajo', () => {
    expect(calcularPuntosPorPedido(1000)).toBe(10);
    expect(calcularPuntosPorPedido(1099)).toBe(10);
    expect(calcularPuntosPorPedido(99)).toBe(0);
    expect(calcularPuntosPorPedido(0)).toBe(0);
  });
});

describe('acreditarPorPedido', () => {
  it('no acredita nada si el pedido no llega a generar puntos', async () => {
    await acreditarPorPedido(pedido({ total: 50 }));
    expect(acreditarPuntos).not.toHaveBeenCalled();
  });

  it('acredita floor(total/100) puntos al cliente dueño del pedido', async () => {
    await acreditarPorPedido(pedido({ id: 'pedido-9', user_id: 'user-9', total: 2599 }));
    expect(acreditarPuntos).toHaveBeenCalledWith('pedido-9', 'user-9', 25);
  });
});

describe('crearPremio', () => {
  it('rechaza sin nombre', async () => {
    await expect(crearPremio({ nombre: '  ', tipo: 'porcentaje' as never, costo_puntos: 100 } as never))
      .rejects.toMatchObject({ statusCode: 400, code: 'PREMIO_NOMBRE_REQUERIDO' });
    expect(crearPremioRepo).not.toHaveBeenCalled();
  });

  it('rechaza costo_puntos <= 0', async () => {
    await expect(crearPremio({ nombre: 'Termo', costo_puntos: 0 }))
      .rejects.toMatchObject({ statusCode: 400, code: 'PREMIO_COSTO_INVALIDO' });
    expect(crearPremioRepo).not.toHaveBeenCalled();
  });

  it('crea normalmente con datos válidos', async () => {
    crearPremioRepo.mockResolvedValue(premio());
    await crearPremio({ nombre: '  Termo Apotheka  ', costo_puntos: 500 });
    expect(crearPremioRepo).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Termo Apotheka', costo_puntos: 500 }));
  });
});

describe('actualizarPremio', () => {
  const ID = '11111111-1111-1111-1111-111111111111';

  it('rechaza si no se manda ningún campo', async () => {
    await expect(actualizarPremio(ID, {}))
      .rejects.toMatchObject({ statusCode: 400, code: 'SIN_CAMBIOS' });
    expect(actualizarPremioRepo).not.toHaveBeenCalled();
  });

  it('rechaza costo_puntos <= 0', async () => {
    await expect(actualizarPremio(ID, { costo_puntos: -10 }))
      .rejects.toMatchObject({ statusCode: 400, code: 'PREMIO_COSTO_INVALIDO' });
  });

  it('rechaza si el premio no existe', async () => {
    actualizarPremioRepo.mockResolvedValue(null);
    await expect(actualizarPremio(ID, { activo: false }))
      .rejects.toMatchObject({ statusCode: 404, code: 'PREMIO_NOT_FOUND' });
  });

  it('permite pausar (activo: false) sin tocar otros campos', async () => {
    actualizarPremioRepo.mockResolvedValue(premio({ activo: false }));
    await actualizarPremio(ID, { activo: false });
    expect(actualizarPremioRepo).toHaveBeenCalledWith(ID, { activo: false });
  });
});

describe('crearClienteFisico', () => {
  const ADMIN_ID = 'admin-1';

  it('rechaza sin nombre', async () => {
    await expect(crearClienteFisico(clienteFisicoDTO({ nombre: '  ' }), ADMIN_ID))
      .rejects.toMatchObject({ statusCode: 400, code: 'CLIENTE_FISICO_NOMBRE_REQUERIDO' });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rechaza sin apellido', async () => {
    await expect(crearClienteFisico(clienteFisicoDTO({ apellido: '' }), ADMIN_ID))
      .rejects.toMatchObject({ statusCode: 400, code: 'CLIENTE_FISICO_APELLIDO_REQUERIDO' });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rechaza sin teléfono', async () => {
    await expect(crearClienteFisico(clienteFisicoDTO({ telefono: '   ' }), ADMIN_ID))
      .rejects.toMatchObject({ statusCode: 400, code: 'CLIENTE_FISICO_TELEFONO_REQUERIDO' });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rechaza un CUIT con dígito verificador inválido', async () => {
    await expect(crearClienteFisico(clienteFisicoDTO({ dni: '20123456780' }), ADMIN_ID))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_DOCUMENTO' });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rechaza si ya existe un perfil con ese CUIT', async () => {
    encontrarPorDniPerfil.mockResolvedValue([{ user_id: 'existente' }]);

    await expect(crearClienteFisico(clienteFisicoDTO(), ADMIN_ID))
      .rejects.toMatchObject({ statusCode: 409, code: 'CLIENTE_FISICO_CUIT_DUPLICADO' });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('si falla la creación del usuario de Auth, no intenta crear el perfil', async () => {
    createUser.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(crearClienteFisico(clienteFisicoDTO(), ADMIN_ID))
      .rejects.toMatchObject({ statusCode: 502, code: 'CLIENTE_FISICO_AUTH_ERROR' });
    expect(crearClienteFisicoRepo).not.toHaveBeenCalled();
  });

  it('si falla el insert del perfil después de crear el usuario de Auth, revierte con deleteUser', async () => {
    createUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
    crearClienteFisicoRepo.mockRejectedValue(new Error('insert falló'));

    await expect(crearClienteFisico(clienteFisicoDTO(), ADMIN_ID))
      .rejects.toMatchObject({ statusCode: 500, code: 'CLIENTE_FISICO_ERROR' });
    expect(deleteUser).toHaveBeenCalledWith('auth-user-1');
  });

  it('camino feliz: crea el usuario de Auth con el email sintético derivado del CUIT y el perfil', async () => {
    createUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
    crearClienteFisicoRepo.mockResolvedValue({
      user_id: 'auth-user-1', nombre: 'Juan', apellido: 'Pérez', dni: '20123456786',
      documento_tipo: 'CUIT', genero: null, fecha_nacimiento: null, telefono: '3511234567',
      foto_url: null, creado_en: '', actualizado_en: '', es_cliente_fisico: true,
    });

    const resultado = await crearClienteFisico(clienteFisicoDTO(), ADMIN_ID);

    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'cliente-fisico-20123456786@apotheka.invalid',
      user_metadata: expect.objectContaining({ es_cliente_fisico: true, cuit: '20123456786', creado_por_admin_id: ADMIN_ID }),
    }));
    expect(crearClienteFisicoRepo).toHaveBeenCalledWith('auth-user-1', expect.objectContaining({
      nombre: 'Juan', apellido: 'Pérez', dni: '20123456786', telefono: '3511234567', creadoPorAdminId: ADMIN_ID,
    }));
    expect(resultado).toMatchObject({ user_id: 'auth-user-1', es_cliente_fisico: true, puntos_saldo: 0 });
  });
});
