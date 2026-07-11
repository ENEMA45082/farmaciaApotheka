import { describe, it, expect } from 'vitest';
import { validarUUID } from './validarUUID';
import { AppError } from '../errors/AppError';

describe('validarUUID', () => {
  it('no lanza error con un UUID válido', () => {
    expect(() => validarUUID('74bcbf23-46fc-4c4e-b514-e6b47cb5dfe0')).not.toThrow();
  });

  it('acepta UUID en mayúsculas', () => {
    expect(() => validarUUID('74BCBF23-46FC-4C4E-B514-E6B47CB5DFE0')).not.toThrow();
  });

  it('lanza AppError 400 con un string que no es UUID', () => {
    expect(() => validarUUID('no-es-un-uuid')).toThrow(AppError);
    try {
      validarUUID('no-es-un-uuid', 'pedido');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(400);
      expect((err as AppError).message).toContain('pedido');
    }
  });

  it('rechaza un UUID con longitud incorrecta', () => {
    expect(() => validarUUID('74bcbf23-46fc-4c4e-b514-e6b47cb5dfe')).toThrow(AppError);
  });

  it('rechaza string vacío', () => {
    expect(() => validarUUID('')).toThrow(AppError);
  });
});
