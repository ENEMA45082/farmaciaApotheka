import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Perfil, ActualizarPerfilDTO } from '../types';

const { encontrarOCrear, actualizarRepo, fusionarClienteFisico } = vi.hoisted(() => ({
  encontrarOCrear: vi.fn(),
  actualizarRepo: vi.fn(),
  fusionarClienteFisico: vi.fn(),
}));

vi.mock('../repositories/perfil.repository', () => ({
  encontrarOCrear,
  actualizar: actualizarRepo,
  fusionarClienteFisico,
}));

import { actualizar } from './perfil.service';

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
    es_cliente_fisico: false,
    ...overrides,
  };
}

const CUIT_VALIDO = '20123456786'; // ver Backend/src/utils/validarDocumento.test.ts

beforeEach(() => {
  encontrarOCrear.mockReset();
  encontrarOCrear.mockResolvedValue(perfil());
  actualizarRepo.mockReset();
  actualizarRepo.mockResolvedValue(perfil({ dni: CUIT_VALIDO, documento_tipo: 'CUIT' }));
  fusionarClienteFisico.mockReset();
  fusionarClienteFisico.mockResolvedValue(null);
});

describe('actualizar', () => {
  it('no valida documento ni intenta fusionar si dni/documento_tipo no vienen en el DTO', async () => {
    await actualizar('user-1', { nombre: 'Nuevo nombre' } as ActualizarPerfilDTO);

    expect(fusionarClienteFisico).not.toHaveBeenCalled();
    expect(actualizarRepo).toHaveBeenCalledWith('user-1', { nombre: 'Nuevo nombre' });
  });

  it('no intenta fusionar si el documento sigue siendo DNI', async () => {
    encontrarOCrear.mockResolvedValue(perfil({ documento_tipo: 'DNI', dni: '12345678' }));

    await actualizar('user-1', { dni: '87654321' } as ActualizarPerfilDTO);

    expect(fusionarClienteFisico).not.toHaveBeenCalled();
  });

  it('no intenta fusionar si el CUIT es inválido (validarDocumento rechaza antes)', async () => {
    await expect(actualizar('user-1', { dni: '123', documento_tipo: 'CUIT' } as ActualizarPerfilDTO))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_DOCUMENTO' });

    expect(fusionarClienteFisico).not.toHaveBeenCalled();
    expect(actualizarRepo).not.toHaveBeenCalled();
  });

  it('fusiona con el CUIT normalizado (sin guiones) cuando el documento es CUIT', async () => {
    await actualizar('user-1', { dni: '20-12345678-6', documento_tipo: 'CUIT' } as ActualizarPerfilDTO);

    expect(fusionarClienteFisico).toHaveBeenCalledWith('user-1', CUIT_VALIDO);
    expect(actualizarRepo).toHaveBeenCalledWith('user-1', expect.objectContaining({ dni: CUIT_VALIDO }));
  });

  it('si la fusión no encuentra nada para fusionar (devuelve null), igual actualiza el perfil con normalidad', async () => {
    fusionarClienteFisico.mockResolvedValue(null);

    const resultado = await actualizar('user-1', { dni: CUIT_VALIDO, documento_tipo: 'CUIT' } as ActualizarPerfilDTO);

    expect(actualizarRepo).toHaveBeenCalled();
    expect(resultado).toEqual(perfil({ dni: CUIT_VALIDO, documento_tipo: 'CUIT' }));
  });
});
