import { describe, it, expect } from 'vitest';
import { puedeTransicionar, esMotivoCancelacionValido } from './estadosPedido';

describe('puedeTransicionar', () => {
  it('permite las transiciones normales del flujo de un pedido', () => {
    expect(puedeTransicionar('PendienteDePago', 'Confirmado')).toBe(true);
    expect(puedeTransicionar('Confirmado', 'EnPreparacion')).toBe(true);
    expect(puedeTransicionar('EnPreparacion', 'Enviado')).toBe(true);
    expect(puedeTransicionar('EnPreparacion', 'ListoParaRetirar')).toBe(true);
    expect(puedeTransicionar('Enviado', 'Entregado')).toBe(true);
    expect(puedeTransicionar('ListoParaRetirar', 'Entregado')).toBe(true);
  });

  it('permite cancelar desde cualquier estado no final', () => {
    expect(puedeTransicionar('PendienteDePago', 'Cancelado')).toBe(true);
    expect(puedeTransicionar('Confirmado', 'Cancelado')).toBe(true);
    expect(puedeTransicionar('EnPreparacion', 'Cancelado')).toBe(true);
  });

  it('no permite saltear pasos del flujo', () => {
    expect(puedeTransicionar('PendienteDePago', 'Enviado')).toBe(false);
    expect(puedeTransicionar('PendienteDePago', 'Entregado')).toBe(false);
    expect(puedeTransicionar('Confirmado', 'Entregado')).toBe(false);
  });

  it('no permite retroceder en el flujo', () => {
    expect(puedeTransicionar('Confirmado', 'PendienteDePago')).toBe(false);
    expect(puedeTransicionar('Enviado', 'Confirmado')).toBe(false);
  });

  it('los estados finales no permiten ninguna transición', () => {
    expect(puedeTransicionar('Entregado', 'Confirmado')).toBe(false);
    expect(puedeTransicionar('Entregado', 'Cancelado')).toBe(false);
    expect(puedeTransicionar('Cancelado', 'Confirmado')).toBe(false);
    expect(puedeTransicionar('Cancelado', 'PendienteDePago')).toBe(false);
  });
});

describe('esMotivoCancelacionValido', () => {
  it('acepta los motivos definidos', () => {
    expect(esMotivoCancelacionValido('sin_stock')).toBe(true);
    expect(esMotivoCancelacionValido('pago_rechazado')).toBe(true);
    expect(esMotivoCancelacionValido('otro')).toBe(true);
  });

  it('rechaza motivos no definidos', () => {
    expect(esMotivoCancelacionValido('motivo_inventado')).toBe(false);
    expect(esMotivoCancelacionValido('')).toBe(false);
  });
});
