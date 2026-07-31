export function recopilarDescendientes(
  idPadre: string,
  todas: { id: string; id_padre: string | null }[],
  visitados: Set<string> = new Set(),
): string[] {
  // Guarda contra ciclos en los datos (categoría que termina siendo su propio
  // antepasado): sin esto, un ciclo produce recursión infinita y revienta el
  // stack. categorias.service.ts ya bloquea crear un ciclo al escribir — esto
  // es la segunda línea de defensa para cuando ya existe uno igual.
  if (visitados.has(idPadre)) return [];
  visitados.add(idPadre);

  const hijos = todas.filter(c => c.id_padre === idPadre);
  return [idPadre, ...hijos.flatMap(h => recopilarDescendientes(h.id, todas, visitados))];
}
