import type { Pedido } from '../types';

export type EstadoPedido = Pedido['estado'];

export const ESTADOS_FINALES: EstadoPedido[] = ['Entregado', 'Cancelado'];

export const TRANSICIONES_VALIDAS: Record<EstadoPedido, EstadoPedido[]> = {
  PendienteDePago:  ['Confirmado', 'Cancelado'],
  Confirmado:       ['EnPreparacion', 'Cancelado'],
  EnPreparacion:    ['Enviado', 'ListoParaRetirar', 'Cancelado'],
  Enviado:          ['Entregado'],
  ListoParaRetirar: ['Entregado'],
  Entregado:        [],
  Cancelado:        [],
};

export function puedeTransicionar(estadoActual: EstadoPedido, estadoNuevo: EstadoPedido): boolean {
  return TRANSICIONES_VALIDAS[estadoActual].includes(estadoNuevo);
}
