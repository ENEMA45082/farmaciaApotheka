import { describe, it, expect } from 'vitest';
import { AppError } from '../errors/AppError';
import { parsearCsvPrecios, parsearPrecio, repararMojibake } from './parsearCsvPrecios';

const ENCABEZADO = 'producto;codbarraprinc;precio;neto;precioPublico';
const BOM = String.fromCharCode(0xFEFF);

function csv(...lineas: string[]): Buffer {
  return Buffer.from(lineas.join('\r\n'), 'utf-8');
}

function errorDe(fn: () => unknown): AppError {
  try {
    fn();
  } catch (e) {
    return e as AppError;
  }
  throw new Error('se esperaba que lanzara un error');
}

describe('parsearPrecio', () => {
  it.each([
    ['47364,18', 47364.18],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['1234.56', 1234.56],
    ['$ 1.234,56', 1234.56],
    ['1.234', 1234],
    ['1.234.567', 1234567],
    ['1,234,567', 1234567],
    ['12.5', 12.5],
    ['999999', 999999],
    ['14366,0748', 14366.07],
    ['21029,6587', 21029.66],
  ])('%s -> %s', (crudo, esperado) => {
    expect(parsearPrecio(crudo)).toBe(esperado);
  });

  it.each(['', '   ', 'abc', '0', '0,00', '-5', '$'])('%j no es un precio válido', crudo => {
    expect(parsearPrecio(crudo)).toBeNull();
  });
});

describe('repararMojibake', () => {
  it('deshace acentos doblemente codificados', () => {
    expect(repararMojibake('102 AÃ‘OS PLUS CPR X 30')).toBe('102 AÑOS PLUS CPR X 30');
    expect(repararMojibake('Ã¡rbol de TÃ©')).toBe('árbol de Té');
  });

  it('deja igual un texto que ya está bien', () => {
    expect(repararMojibake('102 AÑOS PLUS')).toBe('102 AÑOS PLUS');
    expect(repararMojibake('Actron Rapida Accion x 10')).toBe('Actron Rapida Accion x 10');
  });

  it('deja igual un texto con Ã que no es mojibake', () => {
    // Ω no existe en cp1252: el texto no salió de un doble encoding.
    expect(repararMojibake('AÃΩ')).toBe('AÃΩ');
    // Ã seguida de un byte que no forma UTF-8 válido.
    expect(repararMojibake('Ã seguido de espacio')).toBe('Ã seguido de espacio');
  });
});

describe('parsearCsvPrecios', () => {
  it('usa preciopublico (no precio) y lee las columnas en cualquier orden y caso', () => {
    const r = parsearCsvPrecios(csv(
      'PrecioPublico;Neto;PRECIO;CodBarraPrinc;Producto',
      '150,50;1;99;7795349501525;Treginax 100 mg',
    ));

    expect(r.filas).toEqual([{ codigoBarras: '7795349501525', nombre: 'Treginax 100 mg', precio: 150.5 }]);
  });

  it('acepta separador coma con precios decimales entre comillas', () => {
    const r = parsearCsvPrecios(csv(
      'producto,codbarraprinc,precio,neto,precioPublico',
      '"Ibupirac 400, x 20",7791234567890,"10,5",0,"1.234,56"',
    ));

    expect(r.filas).toEqual([{ codigoBarras: '7791234567890', nombre: 'Ibupirac 400, x 20', precio: 1234.56 }]);
  });

  it('ignora el BOM de un CSV UTF-8 de Excel', () => {
    const r = parsearCsvPrecios(Buffer.from(`${BOM}${ENCABEZADO}\r\nA;7791;1;1;100\r\n`, 'utf-8'));

    expect(r.filas).toHaveLength(1);
  });

  it('lee como latin1 un archivo que no es UTF-8 válido', () => {
    const r = parsearCsvPrecios(Buffer.from(`${ENCABEZADO}\r\nCafé ñandú;7791;1;1;100,5\r\n`, 'latin1'));

    expect(r.filas[0].nombre).toBe('Café ñandú');
  });

  it('rechaza el archivo si falta precioPublico, sin caer a la columna precio', () => {
    const error = errorDe(() => parsearCsvPrecios(csv(
      'Tipo;Producto;CodBarraPrinc;Precio',
      'D;A;7791;100',
    )));

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('CSV_COLUMNAS_INVALIDAS');
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('Tipo, Producto, CodBarraPrinc, Precio');
  });

  it('rechaza un archivo sin filas de datos', () => {
    expect(errorDe(() => parsearCsvPrecios(csv(ENCABEZADO))).code).toBe('CSV_VACIO');
    expect(errorDe(() => parsearCsvPrecios(Buffer.from(''))).code).toBe('CSV_VACIO');
  });

  it('cuenta las filas descartadas según el motivo', () => {
    const r = parsearCsvPrecios(csv(
      ENCABEZADO,
      'Bueno;7791;1;1;100',
      'Sin código;;1;1;100',
      'Excel roto;7,79535E+12;1;1;100',
      'Precio cero;7792;1;1;0',
      'Precio texto;7793;1;1;abc',
      'Columnas de más;7794;1;1;100;extra',
      'Columnas de menos;7795;1',
    ));

    expect(r.totalFilas).toBe(7);
    expect(r.filas).toHaveLength(1);
    expect(r.filasSinCodigo).toBe(1);
    expect(r.filasCodigoInvalido).toBe(1);
    expect(r.filasPrecioInvalido).toBe(2);
    expect(r.filasMalFormadas).toBe(2);
  });

  it('repara los acentos doblemente codificados del nombre', () => {
    const r = parsearCsvPrecios(csv(ENCABEZADO, '102 AÃ‘OS PLUS;7791;1;1;100'));

    expect(r.filas[0].nombre).toBe('102 AÑOS PLUS');
  });

  it('ignora una línea de solo separadores al final (Excel) sin contarla como fila', () => {
    const r = parsearCsvPrecios(csv(ENCABEZADO, 'A;7791;1;1;100', ';;;;'));

    expect(r.totalFilas).toBe(1);
    expect(r.filasSinCodigo).toBe(0);
    expect(r.filas).toHaveLength(1);
  });

  it('redondea a centavos un precio público con 4 decimales', () => {
    const r = parsearCsvPrecios(csv(ENCABEZADO, '+50 CPR X 30;7790839000267;8602,44;1;14366,0748'));

    expect(r.filas[0].precio).toBe(14366.07);
  });

  it('tolera un separador de más al final de la línea', () => {
    const r = parsearCsvPrecios(csv(ENCABEZADO, 'A;7791;1;1;100;'));

    expect(r.filas).toHaveLength(1);
    expect(r.filasMalFormadas).toBe(0);
  });

  it('colapsa un código repetido con el mismo precio', () => {
    const r = parsearCsvPrecios(csv(ENCABEZADO, 'A;7791;1;1;100', 'A otra vez;7791;1;1;100,00'));

    expect(r.filas).toHaveLength(1);
    expect(r.duplicadosAmbiguos).toEqual([]);
  });

  it('marca como ambiguo un código repetido con precios distintos y no lo propone', () => {
    const r = parsearCsvPrecios(csv(ENCABEZADO, 'APIDRA;7795312020770;1;1;573076', 'APIDRA INST;7795312020770;1;1;453569,92'));

    expect(r.filas).toEqual([]);
    expect(r.duplicadosAmbiguos).toEqual([{
      codigoBarras: '7795312020770',
      filas: [
        { nombre: 'APIDRA', precio: 573076 },
        { nombre: 'APIDRA INST', precio: 453569.92 },
      ],
    }]);
  });

  it('trata como el mismo código el que difiere solo en ceros a la izquierda', () => {
    const r = parsearCsvPrecios(csv(ENCABEZADO, 'A;07791;1;1;100', 'B;7791;1;1;200'));

    expect(r.filas).toEqual([]);
    expect(r.duplicadosAmbiguos).toHaveLength(1);
  });
});
