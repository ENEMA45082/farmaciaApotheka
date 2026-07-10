export function recopilarDescendientes(
  idPadre: string,
  todas: { id: string; id_padre: string | null }[],
): string[] {
  const hijos = todas.filter(c => c.id_padre === idPadre);
  return [idPadre, ...hijos.flatMap(h => recopilarDescendientes(h.id, todas))];
}
