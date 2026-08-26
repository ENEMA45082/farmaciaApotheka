// Postgres interpreta % (cualquier secuencia) y _ (un carácter cualquiera) como
// comodines en cualquier posición de un patrón LIKE/ILIKE, vengan de donde vengan
// — sin escapar, un usuario que busca literalmente "%" hace que el patrón
// `%${busqueda}%` termine siendo `%%%` (coincide con cualquier cosa) en vez de
// "contiene el símbolo %". Postgres usa \ como carácter de escape por default en
// LIKE/ILIKE, así que anteponerlo a % y _ los vuelve literales de nuevo.
export function escaparPatronLike(texto: string): string {
  return texto.replace(/[%_]/g, '\\$&');
}
