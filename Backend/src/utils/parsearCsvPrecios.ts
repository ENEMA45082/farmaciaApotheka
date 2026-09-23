import { AppError } from '../errors/AppError';
import { normalizarCodigoBarras } from './precioImportacion';

export interface FilaCsvPrecios {
  codigoBarras: string;
  nombre: string;
  precio: number;
}

// Un mismo código de barras que aparece más de una vez en el CSV con precios
// distintos (ej. la versión normal y la "INST." de una insulina). No hay forma
// de saber cuál es el que corresponde, así que no se propone ningún cambio.
export interface DuplicadoAmbiguoCsv {
  codigoBarras: string;
  filas: { nombre: string; precio: number }[];
}

export interface ResultadoCsvPrecios {
  filas: FilaCsvPrecios[];
  duplicadosAmbiguos: DuplicadoAmbiguoCsv[];
  totalFilas: number;
  filasSinCodigo: number;
  filasCodigoInvalido: number;
  filasPrecioInvalido: number;
  filasMalFormadas: number;
}

const COLUMNAS_REQUERIDAS = { barras: 'codbarraprinc', precio: 'preciopublico', producto: 'producto' } as const;

function dividirLineaCsv(linea: string, separador: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let dentroComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const char = linea[i];

    if (dentroComillas) {
      if (char === '"') {
        if (linea[i + 1] === '"') {
          actual += '"';
          i++;
        } else {
          dentroComillas = false;
        }
      } else {
        actual += char;
      }
    } else if (char === '"' && actual === '') {
      dentroComillas = true;
    } else if (char === separador) {
      campos.push(actual);
      actual = '';
    } else {
      actual += char;
    }
  }
  campos.push(actual);

  return campos;
}

// UTF-8 si el archivo lo es; si no (una planilla guardada como "CSV" en
// Windows sale en ANSI) se lee como latin1 para no romper las tildes y las ñ.
function decodificar(buffer: Buffer): string {
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    texto = buffer.toString('latin1');
  }
  return texto.replace(/^\uFEFF/, '');
}

// Bytes de cp1252 en 0x80-0x9F que se ven como un carácter fuera de latin1.
const CP1252_ALTO: Record<number, number> = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86,
  0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
  0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95,
  0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
  0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
};

// Un CSV que se abrió y volvió a guardar leyendo UTF-8 como ANSI queda con los
// acentos doblemente codificados ("AÑOS" -> "AÃ‘OS") aunque el archivo sea
// UTF-8 válido. Se deshace re-codificando el texto como cp1252 y leyéndolo de
// nuevo como UTF-8; si algún carácter no viene de cp1252 o el resultado no es
// UTF-8 válido, no era ese caso y el texto se devuelve tal cual.
export function repararMojibake(texto: string): string {
  if (!/[ÃÂ]/.test(texto)) return texto;

  const bytes: number[] = [];
  for (const caracter of texto) {
    const codigo = caracter.codePointAt(0)!;
    if (codigo < 0x100) bytes.push(codigo);
    else if (CP1252_ALTO[codigo] !== undefined) bytes.push(CP1252_ALTO[codigo]);
    else return texto;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    return texto;
  }
}

function detectarSeparador(encabezado: string): string {
  const candidatos = [';', ',', '\t'];
  let mejor = ';';
  let max = -1;
  for (const c of candidatos) {
    const n = encabezado.split(c).length - 1;
    if (n > max) { mejor = c; max = n; }
  }
  return mejor;
}

function normalizarEncabezado(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Acepta "47364,18", "1.234,56", "1234.56" y "$ 1.234,56". Devuelve null si
// no es un número mayor a 0. Un solo punto seguido de exactamente 3 dígitos
// ("1.234") se lee como separador de miles, no como decimal.
export function parsearPrecio(crudo: string): number | null {
  const limpio = crudo.replace(/[^\d.,-]/g, '');
  if (!limpio || limpio.includes('-')) return null;

  const ultimaComa  = limpio.lastIndexOf(',');
  const ultimoPunto = limpio.lastIndexOf('.');
  let normalizado: string;

  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    const decimal = ultimaComa > ultimoPunto ? ',' : '.';
    const miles   = decimal === ',' ? /\./g : /,/g;
    normalizado = limpio.replace(miles, '').replace(decimal, '.');
  } else if (ultimaComa !== -1) {
    normalizado = limpio.split(',').length > 2
      ? limpio.replace(/,/g, '')
      : limpio.replace(',', '.');
  } else if (ultimoPunto !== -1) {
    const esMiles = limpio.split('.').length > 2 || /^\d{1,3}\.\d{3}$/.test(limpio);
    normalizado = esMiles ? limpio.replace(/\./g, '') : limpio;
  } else {
    normalizado = limpio;
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.round(numero * 100) / 100;
}

// Excel convierte un código largo en "7,79535E+12" y el dato original ya no
// se puede recuperar.
function esNotacionCientifica(codigo: string): boolean {
  return /^\d+([.,]\d+)?e[+-]?\d+$/i.test(codigo);
}

export function parsearCsvPrecios(buffer: Buffer): ResultadoCsvPrecios {
  // Una línea con solo separadores (";;;;", que Excel deja al final) no es una fila.
  const lineas = decodificar(buffer).split(/\r?\n/).filter(l => l.replace(/[\s;,"]/g, '').length > 0);

  if (lineas.length < 2) {
    throw new AppError('El archivo no tiene filas de datos', 400, 'CSV_VACIO');
  }

  const separador = detectarSeparador(lineas[0]);
  const encabezados = dividirLineaCsv(lineas[0], separador).map(normalizarEncabezado);
  const idxBarras   = encabezados.indexOf(COLUMNAS_REQUERIDAS.barras);
  const idxPrecio   = encabezados.indexOf(COLUMNAS_REQUERIDAS.precio);
  const idxProducto = encabezados.indexOf(COLUMNAS_REQUERIDAS.producto);

  if (idxBarras === -1 || idxPrecio === -1 || idxProducto === -1) {
    const encontradas = dividirLineaCsv(lineas[0], separador).map(h => h.trim()).join(', ');
    throw new AppError(
      `El CSV no tiene las columnas esperadas (CodBarraPrinc, precioPublico y Producto). Se encontraron: ${encontradas}`,
      400,
      'CSV_COLUMNAS_INVALIDAS',
    );
  }

  const porCodigo = new Map<string, { codigoBarras: string; filas: { nombre: string; precio: number }[] }>();
  const resultado = {
    totalFilas: lineas.length - 1,
    filasSinCodigo: 0,
    filasCodigoInvalido: 0,
    filasPrecioInvalido: 0,
    filasMalFormadas: 0,
  };

  for (let i = 1; i < lineas.length; i++) {
    const cols = dividirLineaCsv(lineas[i], separador);
    // Separadores de más al final de la línea (columnas vacías) se toleran.
    while (cols.length > encabezados.length && cols[cols.length - 1].trim() === '') cols.pop();

    // Una fila con otra cantidad de columnas que el encabezado tiene los
    // datos corridos (ej. una coma decimal sin comillas en un CSV separado
    // por comas): leer "precioPublico" de ahí cargaría un precio equivocado.
    if (cols.length !== encabezados.length) { resultado.filasMalFormadas++; continue; }

    const codigoBarras = cols[idxBarras].trim().replace(/^'/, '');
    if (!codigoBarras) { resultado.filasSinCodigo++; continue; }
    if (esNotacionCientifica(codigoBarras) || !normalizarCodigoBarras(codigoBarras)) {
      resultado.filasCodigoInvalido++;
      continue;
    }

    const precio = parsearPrecio(cols[idxPrecio]);
    if (precio === null) { resultado.filasPrecioInvalido++; continue; }

    const clave = normalizarCodigoBarras(codigoBarras);
    const fila  = { nombre: repararMojibake(cols[idxProducto].trim()), precio };
    const previo = porCodigo.get(clave);
    if (previo) previo.filas.push(fila);
    else porCodigo.set(clave, { codigoBarras, filas: [fila] });
  }

  const filas: FilaCsvPrecios[] = [];
  const duplicadosAmbiguos: DuplicadoAmbiguoCsv[] = [];

  for (const { codigoBarras, filas: repeticiones } of porCodigo.values()) {
    const precios = new Set(repeticiones.map(f => f.precio));
    if (precios.size > 1) {
      duplicadosAmbiguos.push({ codigoBarras, filas: repeticiones });
    } else {
      filas.push({ codigoBarras, nombre: repeticiones[0].nombre, precio: repeticiones[0].precio });
    }
  }

  return { filas, duplicadosAmbiguos, ...resultado };
}
