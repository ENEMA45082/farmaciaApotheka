export interface FilaCsvPrecios {
  codigoBarras: string;
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

  const encabezados = lineas[0].split(';').map(h => h.trim());
  const idxBarras = encabezados.indexOf('CodBarraPrinc');
  const idxPrecio = encabezados.indexOf('Precio');

  if (idxBarras === -1 || idxPrecio === -1) {
    throw new Error(
      `El CSV no tiene las columnas esperadas. Se encontraron: ${encabezados.join(', ')}`
    );
  }

  const filas: FilaCsvPrecios[] = [];
  let filasSaltadas = 0;

  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(';');
    const codigoBarras = cols[idxBarras]?.trim() ?? '';
    const precioRaw    = cols[idxPrecio]?.trim()  ?? '';

    if (!codigoBarras) { filasSaltadas++; continue; }

    const precioNorm = precioRaw.replace(',', '.');
    const precio = parseFloat(precioNorm);

    if (isNaN(precio) || precio < 0) { filasSaltadas++; continue; }

    filas.push({ codigoBarras, precio });
  }

  return { filas, filasSaltadas };
}
