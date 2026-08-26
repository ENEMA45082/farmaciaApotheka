import { describe, it, expect } from 'vitest';
import { validarDocumento, extraerDniDeCuit } from './validarDocumento';
import { AppError } from '../errors/AppError';

describe('validarDocumento — DNI', () => {
  it('acepta un DNI de 7 u 8 dígitos', () => {
    expect(() => validarDocumento('DNI', '1234567')).not.toThrow();
    expect(() => validarDocumento('DNI', '12345678')).not.toThrow();
  });

  it('rechaza un DNI con menos de 7 o más de 8 dígitos', () => {
    expect(() => validarDocumento('DNI', '123456')).toThrow(AppError);
    expect(() => validarDocumento('DNI', '123456789')).toThrow(AppError);
  });
});

describe('validarDocumento — CUIT', () => {
  it('acepta un CUIT con dígito verificador correcto', () => {
    // 20-12345678-6 -> dígito verificador válido (DNI 12345678, prefijo 20)
    expect(() => validarDocumento('CUIT', '20123456786')).not.toThrow();
    // 20-01234567-5 -> DNI de 7 dígitos (01234567), prefijo 20
    expect(() => validarDocumento('CUIT', '20012345675')).not.toThrow();
  });

  it('acepta un CUIT con guiones/espacios, validando solo los dígitos', () => {
    expect(() => validarDocumento('CUIT', '20-12345678-6')).not.toThrow();
  });

  it('rechaza un CUIT que no tenga exactamente 11 dígitos', () => {
    expect(() => validarDocumento('CUIT', '2012345678')).toThrow(AppError);   // 10 dígitos
    expect(() => validarDocumento('CUIT', '201234567860')).toThrow(AppError); // 12 dígitos
  });

  it('rechaza un CUIT con el dígito verificador incorrecto', () => {
    expect(() => validarDocumento('CUIT', '20123456780')).toThrow(AppError);
    try {
      validarDocumento('CUIT', '20123456780');
    } catch (err) {
      expect((err as AppError).statusCode).toBe(400);
      expect((err as AppError).code).toBe('INVALID_DOCUMENTO');
    }
  });
});

describe('extraerDniDeCuit', () => {
  it('extrae el DNI de 8 dígitos embebido en el CUIT', () => {
    expect(extraerDniDeCuit('20123456786')).toBe('12345678');
  });

  it('extrae el DNI y le saca el cero a la izquierda cuando el DNI real tiene 7 dígitos', () => {
    expect(extraerDniDeCuit('20012345675')).toBe('1234567');
  });

  it('devuelve el valor tal cual si no tiene 11 dígitos (no es un CUIT)', () => {
    expect(extraerDniDeCuit('12345678')).toBe('12345678');
  });
});
