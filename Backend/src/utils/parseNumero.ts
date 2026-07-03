export function parseNumero(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  const n = Number(valor);
  return Number.isFinite(n) ? n : undefined;
}
