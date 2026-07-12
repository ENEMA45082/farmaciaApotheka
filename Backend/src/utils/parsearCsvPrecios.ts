export interface FilaCsvPrecios {
  codigoBarras: string;
  nombre: string;
  precio: number;
}

export function parsearCsvPrecios(buffer: Buffer): {
  filas: FilaCsvPrecios[];
  filasSaltadas: number;
} {
  const texto = buffer.toString('utf-8');
  const lineas = texto.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lineas.length < 2) {
    return { filas: [], filasSaltadas: 0 };
  }

  const separador = lineas[0].split(';').length >= lineas[0].split(',').length ? ';' : ',';

  const encabezados = lineas[0].split(separador).map(h => h.trim());
  const idxBarras   = encabezados.indexOf('CodBarraPrinc');
  const idxPrecio   = encabezados.indexOf('Precio');
  const idxProducto = encabezados.indexOf('Producto');

  if (idxBarras === -1 || idxPrecio === -1 || idxProducto === -1) {
    throw new Error(
      `El CSV no tiene las columnas esperadas. Se encontraron: ${encabezados.join(', ')}`
    );
  }

  const filas: FilaCsvPrecios[] = [];
  let filasSaltadas = 0;

  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(separador);
    const codigoBarras = cols[idxBarras]?.trim()   ?? '';
    const precioRaw    = cols[idxPrecio]?.trim()   ?? '';
    const nombre       = cols[idxProducto]?.trim() ?? '';

    if (!codigoBarras) { filasSaltadas++; continue; }

    const precioNorm = precioRaw.replace(',', '.');
    const precio = parseFloat(precioNorm);

    if (isNaN(precio) || precio < 0) { filasSaltadas++; continue; }

    filas.push({ codigoBarras, nombre, precio });
  }

  return { filas, filasSaltadas };
}
