export type CantidadCuotas = 1 | 3 | 6;

export const CUOTAS_DISPONIBLES: readonly CantidadCuotas[] = [1, 3, 6];

// Coeficientes de financiación con IVA incluido (lo que se le termina
// cobrando al cliente). Duplicado a mano en Frontend/src/config/cuotas.ts
// para el preview antes de crear el pedido — mantener ambos en sync.
export const COEFICIENTES_CUOTAS: Record<CantidadCuotas, number> = {
  1: 1,
  3: 1.2123,
  6: 1.4000,
};

export function esCantidadCuotasValida(cuotas: number): cuotas is CantidadCuotas {
  return (CUOTAS_DISPONIBLES as readonly number[]).includes(cuotas);
}

// montoBase = todo lo que se cobra por tarjeta (productos netos de cupón + costo de envío).
export function calcularRecargoFinanciero(montoBase: number, cuotas: CantidadCuotas): number {
  const totalConRecargo = montoBase * COEFICIENTES_CUOTAS[cuotas];
  return Math.round((totalConRecargo - montoBase) * 100) / 100;
}

export function calcularMontoPorCuota(montoBase: number, cuotas: CantidadCuotas): number {
  const totalConRecargo = montoBase * COEFICIENTES_CUOTAS[cuotas];
  return Math.round((totalConRecargo / cuotas) * 100) / 100;
}
