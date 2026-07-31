import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Categoria } from '../types';

const { encontrarPorId, encontrarTodas, crear: crearRepo, actualizar: actualizarRepo } = vi.hoisted(() => ({
  encontrarPorId: vi.fn(),
  encontrarTodas: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
}));

vi.mock('../repositories/categorias.repository', () => ({
  encontrarPorId,
  encontrarTodas,
  crear: crearRepo,
  actualizar: actualizarRepo,
}));
vi.mock('../repositories/productos.repository', () => ({ contarPorCategorias: vi.fn() }));

import { crear, actualizar } from './categorias.service';

function categoria(overrides: Partial<Categoria> = {}): Categoria {
  return {
    id: 'cat-1',
    nombre: 'Categoría',
    id_padre: null,
    creado_en: '2026-07-11T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  encontrarPorId.mockReset();
  encontrarTodas.mockReset();
  crearRepo.mockReset();
  actualizarRepo.mockReset();
});

describe('crear', () => {
  it('rechaza id_padre si esa categoría no existe', async () => {
    encontrarPorId.mockResolvedValue(null);

    await expect(crear({ nombre: 'Hija', id_padre: 'no-existe' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'CATEGORIA_PADRE_NOT_FOUND' });
    expect(crearRepo).not.toHaveBeenCalled();
  });

  it('crea normalmente si id_padre existe', async () => {
    encontrarPorId.mockResolvedValue(categoria({ id: 'padre-1' }));
    crearRepo.mockResolvedValue(categoria({ id: 'nueva', id_padre: 'padre-1' }));

    await crear({ nombre: 'Hija', id_padre: 'padre-1' });

    expect(crearRepo).toHaveBeenCalledWith('Hija', 'padre-1');
  });
});

describe('actualizar', () => {
  const ID = '11111111-1111-1111-1111-111111111111';

  it('rechaza que una categoría sea su propia categoría padre', async () => {
    await expect(actualizar(ID, { id_padre: ID }))
      .rejects.toMatchObject({ statusCode: 400, code: 'CATEGORIA_PADRE_INVALIDO' });
    expect(actualizarRepo).not.toHaveBeenCalled();
  });

  it('rechaza id_padre que no existe', async () => {
    encontrarPorId.mockResolvedValue(null);

    await expect(actualizar(ID, { id_padre: 'no-existe' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'CATEGORIA_PADRE_NOT_FOUND' });
  });

  it('rechaza mover una categoría dentro de una de sus propias subcategorías (ciclo)', async () => {
    // ID es padre de 'hijo', que es padre de 'nieto' — mover ID debajo de 'nieto' es un ciclo.
    encontrarPorId.mockResolvedValue(categoria({ id: 'nieto' }));
    encontrarTodas.mockResolvedValue([
      categoria({ id: ID, id_padre: null }),
      categoria({ id: 'hijo', id_padre: ID }),
      categoria({ id: 'nieto', id_padre: 'hijo' }),
    ]);

    await expect(actualizar(ID, { id_padre: 'nieto' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'CATEGORIA_PADRE_CICLO' });
    expect(actualizarRepo).not.toHaveBeenCalled();
  });

  it('permite mover a un padre válido que no es descendiente', async () => {
    encontrarPorId.mockResolvedValue(categoria({ id: 'otro-padre' }));
    encontrarTodas.mockResolvedValue([
      categoria({ id: ID, id_padre: null }),
      categoria({ id: 'otro-padre', id_padre: null }),
    ]);
    actualizarRepo.mockResolvedValue(categoria({ id: ID, id_padre: 'otro-padre' }));

    const resultado = await actualizar(ID, { id_padre: 'otro-padre' });

    expect(actualizarRepo).toHaveBeenCalledWith(ID, { id_padre: 'otro-padre' });
    expect(resultado.id_padre).toBe('otro-padre');
  });
});
