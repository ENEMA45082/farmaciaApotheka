// Los códigos de barras del CSV y de la base no siempre vienen con el mismo
// relleno (UPC de 12 dígitos vs EAN de 13, o un cero de más por el formato
// de una planilla). Se comparan sin ceros a la izquierda.
export function normalizarCodigoBarras(codigo: string): string {
  return codigo.trim().replace(/^0+/, '');
}

// Nuevo precio de oferta al cambiar el precio de lista, manteniendo el % de
// descuento. Devuelve null si el producto no tiene una oferta por % que
// recalcular (sin oferta, 2x1, o porcentaje fuera de 0-100) — en ese caso
// solo se toca el precio de lista.
export function precioOfertaTrasCambio(
  producto: { en_oferta: boolean; es_2x1: boolean; porcentaje_oferta: number | null },
  precioNuevo: number,
): number | null {
  const pct = producto.porcentaje_oferta;
  if (!producto.en_oferta || producto.es_2x1 || pct == null || pct <= 0 || pct >= 100) {
    return null;
  }
  const calculado = Math.round(precioNuevo * (1 - pct / 100) * 100) / 100;
  // Con precios de centavos el redondeo podría igualar al precio de lista, y
  // una "oferta" que no es menor al precio de lista es un estado inválido
  // (mismo criterio que validarDatosOferta en productos.service.ts).
  const tope = Math.round((precioNuevo - 0.01) * 100) / 100;
  return Math.max(0, Math.min(calculado, tope));
}

function palabrasSignificativas(nombre: string): string[] {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(p => p.length >= 3);
}

// Heurística para avisar que un mismo código de barras podría corresponder a
// productos distintos: ¿comparten al menos el `umbral` de las palabras del
// nombre más corto? Una palabra cuenta como compartida si una es prefijo de
// la otra (ej: "disper" / "dispersables"). Sin palabras suficientes en alguno
// de los dos nombres no hay base para decir que son distintos.
export function nombresParecidos(a: string, b: string, umbral = 0.3): boolean {
  const pa = palabrasSignificativas(a);
  const pb = palabrasSignificativas(b);
  if (pa.length === 0 || pb.length === 0) return true;

  const [corto, largo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  const compartidas = corto.filter(p => largo.some(q => q.startsWith(p) || p.startsWith(q))).length;
  return compartidas / corto.length >= umbral;
}
