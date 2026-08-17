// 1 punto cada $100 de pedido.total (ya con cupón/2x1 descontado — lo que
// el cliente realmente pagó). Constante simple: ajustarla acá no requiere
// migración, no hay configuración por admin en esta fase.
export const PUNTOS_POR_CADA_100 = 100;

export function calcularPuntosPorPedido(total: number): number {
  return Math.floor(total / PUNTOS_POR_CADA_100);
}
