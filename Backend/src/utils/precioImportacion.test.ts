import { describe, it, expect } from 'vitest';
import { normalizarCodigoBarras, nombresParecidos, precioOfertaTrasCambio } from './precioImportacion';

describe('normalizarCodigoBarras', () => {
  it('saca espacios y ceros a la izquierda', () => {
    expect(normalizarCodigoBarras(' 0012345 ')).toBe('12345');
    expect(normalizarCodigoBarras('7795349501525')).toBe('7795349501525');
  });

  it('iguala un UPC de 12 dígitos con su EAN de 13', () => {
    expect(normalizarCodigoBarras('012345678905')).toBe(normalizarCodigoBarras('0012345678905'));
  });
});

describe('precioOfertaTrasCambio', () => {
  const enOferta = { en_oferta: true, es_2x1: false, porcentaje_oferta: 20 };

  it('mantiene el % de descuento sobre el nuevo precio', () => {
    expect(precioOfertaTrasCambio(enOferta, 1000)).toBe(800);
    expect(precioOfertaTrasCambio({ ...enOferta, porcentaje_oferta: 15 }, 333.33)).toBe(283.33);
  });

  it('devuelve null si no hay una oferta por % que recalcular', () => {
    expect(precioOfertaTrasCambio({ ...enOferta, en_oferta: false }, 1000)).toBeNull();
    expect(precioOfertaTrasCambio({ ...enOferta, es_2x1: true }, 1000)).toBeNull();
    expect(precioOfertaTrasCambio({ ...enOferta, porcentaje_oferta: null }, 1000)).toBeNull();
    expect(precioOfertaTrasCambio({ ...enOferta, porcentaje_oferta: 0 }, 1000)).toBeNull();
    expect(precioOfertaTrasCambio({ ...enOferta, porcentaje_oferta: 100 }, 1000)).toBeNull();
  });

  it('nunca deja la oferta igual o mayor al precio de lista, ni siquiera con precios de centavos', () => {
    const oferta = precioOfertaTrasCambio({ ...enOferta, porcentaje_oferta: 1 }, 0.01);

    expect(oferta).not.toBeNull();
    expect(oferta!).toBeLessThan(0.01);
    expect(oferta!).toBeGreaterThanOrEqual(0);
  });
});

describe('nombresParecidos', () => {
  it('reconoce el mismo producto escrito distinto (abreviaturas, tildes, mayúsculas)', () => {
    expect(nombresParecidos('TREGINAX 100 MG CPR DISPER X 30', 'Treginax 100 mg comprimidos dispersables x 30')).toBe(true);
    expect(nombresParecidos('Cápsulas blandas Actron', 'ACTRON CAPSULAS BLANDAS')).toBe(true);
  });

  it('marca como distintos dos productos que no comparten palabras', () => {
    expect(nombresParecidos('Ibupirac 400 x 20', 'Aspirina 500 x 10')).toBe(false);
  });

  it('no puede decir que son distintos si un nombre no tiene palabras útiles', () => {
    expect(nombresParecidos('Ibupirac 400', '')).toBe(true);
    expect(nombresParecidos('', '')).toBe(true);
    expect(nombresParecidos('x 1', 'Ibupirac')).toBe(true);
  });
});
