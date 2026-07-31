import { describe, it, expect } from 'vitest';
import { recopilarDescendientes } from './categoriaTree';

describe('recopilarDescendientes', () => {
  it('devuelve solo la propia categoría si no tiene hijos', () => {
    const todas = [{ id: 'a', id_padre: null }];
    expect(recopilarDescendientes('a', todas)).toEqual(['a']);
  });

  it('incluye hijos directos', () => {
    const todas = [
      { id: 'a', id_padre: null },
      { id: 'b', id_padre: 'a' },
      { id: 'c', id_padre: 'a' },
    ];
    expect(recopilarDescendientes('a', todas).sort()).toEqual(['a', 'b', 'c']);
  });

  it('incluye descendientes de varios niveles', () => {
    const todas = [
      { id: 'a', id_padre: null },
      { id: 'b', id_padre: 'a' },
      { id: 'c', id_padre: 'b' },
      { id: 'd', id_padre: 'c' },
    ];
    expect(recopilarDescendientes('a', todas).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('no incluye ramas de otras categorías', () => {
    const todas = [
      { id: 'a', id_padre: null },
      { id: 'b', id_padre: 'a' },
      { id: 'x', id_padre: null },
      { id: 'y', id_padre: 'x' },
    ];
    expect(recopilarDescendientes('a', todas).sort()).toEqual(['a', 'b']);
  });

  it('devuelve solo el id pedido si no existe en la lista', () => {
    const todas = [{ id: 'a', id_padre: null }];
    expect(recopilarDescendientes('no-existe', todas)).toEqual(['no-existe']);
  });

  it('no entra en recursión infinita si los datos tienen un ciclo', () => {
    // Dato corrupto/inconsistente: a es padre de b, y b es padre de a.
    const todas = [
      { id: 'a', id_padre: 'b' },
      { id: 'b', id_padre: 'a' },
    ];
    expect(() => recopilarDescendientes('a', todas)).not.toThrow();
    expect(recopilarDescendientes('a', todas).sort()).toEqual(['a', 'b']);
  });
});
