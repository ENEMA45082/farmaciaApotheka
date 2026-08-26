import { describe, it, expect } from 'vitest';
import { esCantidadCuotasValida, calcularRecargoFinanciero, calcularMontoPorCuota } from './cuotas';

describe('esCantidadCuotasValida', () => {
  it('acepta 1, 3 y 6', () => {
    expect(esCantidadCuotasValida(1)).toBe(true);
    expect(esCantidadCuotasValida(3)).toBe(true);
    expect(esCantidadCuotasValida(6)).toBe(true);
  });

  it('rechaza cualquier otra cantidad', () => {
    expect(esCantidadCuotasValida(2)).toBe(false);
    expect(esCantidadCuotasValida(4)).toBe(false);
    expect(esCantidadCuotasValida(12)).toBe(false);
    expect(esCantidadCuotasValida(0)).toBe(false);
  });
});

describe('calcularRecargoFinanciero', () => {
  it('no aplica recargo en 1 cuota', () => {
    expect(calcularRecargoFinanciero(10000, 1)).toBe(0);
  });

  it('aplica el coeficiente de 3 cuotas', () => {
    // 10000 * 1.2123 = 12123 -> recargo 2123
    expect(calcularRecargoFinanciero(10000, 3)).toBeCloseTo(2123, 2);
  });

  it('aplica el coeficiente de 6 cuotas', () => {
    // 10000 * 1.4 = 14000 -> recargo 4000
    expect(calcularRecargoFinanciero(10000, 6)).toBeCloseTo(4000, 2);
  });
});

describe('calcularMontoPorCuota', () => {
  it('en 1 cuota es el monto base', () => {
    expect(calcularMontoPorCuota(10000, 1)).toBe(10000);
  });

  it('en 3 cuotas reparte el total con recargo', () => {
    // 12123 / 3 = 4041
    expect(calcularMontoPorCuota(10000, 3)).toBeCloseTo(4041, 2);
  });

  it('en 6 cuotas reparte el total con recargo', () => {
    // 14000 / 6 = 2333.33
    expect(calcularMontoPorCuota(10000, 6)).toBeCloseTo(2333.33, 2);
  });
});
