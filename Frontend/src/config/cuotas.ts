// Duplicado a mano de Backend/src/config/cuotas.ts — mantener ambos en
// sync si cambian los coeficientes. Acá solo se usa para el preview antes
// de crear el pedido; el backend siempre recalcula el recargo de forma
// autoritativa (nunca confía en un monto que mande el cliente).

export type CantidadCuotas = 1 | 3 | 6;

export const CUOTAS_DISPONIBLES: readonly CantidadCuotas[] = [1, 3, 6];

// Coeficientes con IVA incluido (lo que se le termina cobrando al cliente).
export const COEFICIENTES_CUOTAS: Record<CantidadCuotas, number> = {
  1: 1,
  3: 1.2123,
  6: 1.4000,
};

// montoBase = todo lo que se cobra por tarjeta (productos netos de cupón + costo de envío).
export function calcularRecargoFinanciero(montoBase: number, cuotas: CantidadCuotas): number {
  const totalConRecargo = montoBase * COEFICIENTES_CUOTAS[cuotas];
  return Math.round((totalConRecargo - montoBase) * 100) / 100;
}

export function calcularMontoPorCuota(montoBase: number, cuotas: CantidadCuotas): number {
  const totalConRecargo = montoBase * COEFICIENTES_CUOTAS[cuotas];
  return Math.round((totalConRecargo / cuotas) * 100) / 100;
}
