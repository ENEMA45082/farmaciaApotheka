import { describe, it, expect } from 'vitest';
import { escaparPatronLike } from './escaparPatronLike';

describe('escaparPatronLike', () => {
  it('deja pasar texto sin comodines sin cambios', () => {
    expect(escaparPatronLike('ibuprofeno')).toBe('ibuprofeno');
  });

  it('escapa % para que sea literal', () => {
    expect(escaparPatronLike('50% off')).toBe('50\\% off');
  });

  it('escapa _ para que sea literal', () => {
    expect(escaparPatronLike('cod_barras')).toBe('cod\\_barras');
  });

  it('escapa varias apariciones mezcladas', () => {
    expect(escaparPatronLike('%_%')).toBe('\\%\\_\\%');
  });

  it('un texto de solo "%" ya no matchea todo (no colapsa a comodín)', () => {
    expect(escaparPatronLike('%')).toBe('\\%');
  });
});
