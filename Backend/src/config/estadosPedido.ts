export type EstadoPedido =
  | 'PendienteDePago'
  | 'Confirmado'
  | 'EnPreparacion'
  | 'Enviado'
  | 'ListoParaRetirar'
  | 'Entregado'
  | 'Cancelado';

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  'PendienteDePago', 'Confirmado', 'EnPreparacion', 'Enviado', 'ListoParaRetirar', 'Entregado', 'Cancelado',
];

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

export const MOTIVOS_CANCELACION = [
  'sin_stock',
  'pago_no_recibido',
  'pago_rechazado',
  'solicitado_por_cliente',
  'error_direccion',
  'otro',
] as const;

export type MotivoCancelacion = typeof MOTIVOS_CANCELACION[number];

export function esMotivoCancelacionValido(motivo: string): motivo is MotivoCancelacion {
  return (MOTIVOS_CANCELACION as readonly string[]).includes(motivo);
}
