export type ProvinciaCodigo =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'J' | 'K' | 'L' | 'M' | 'N'
  | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

export const PROVINCIAS: { codigo: ProvinciaCodigo; nombre: string }[] = [
  { codigo: 'A', nombre: 'Salta' },
  { codigo: 'B', nombre: 'Buenos Aires' },
  { codigo: 'C', nombre: 'CABA' },
  { codigo: 'D', nombre: 'San Luis' },
  { codigo: 'E', nombre: 'Entre Ríos' },
  { codigo: 'F', nombre: 'La Rioja' },
  { codigo: 'G', nombre: 'Santiago del Estero' },
  { codigo: 'H', nombre: 'Chaco' },
  { codigo: 'J', nombre: 'San Juan' },
  { codigo: 'K', nombre: 'Catamarca' },
  { codigo: 'L', nombre: 'La Pampa' },
  { codigo: 'M', nombre: 'Mendoza' },
  { codigo: 'N', nombre: 'Misiones' },
  { codigo: 'P', nombre: 'Formosa' },
  { codigo: 'Q', nombre: 'Neuquén' },
  { codigo: 'R', nombre: 'Río Negro' },
  { codigo: 'S', nombre: 'Santa Fe' },
  { codigo: 'T', nombre: 'Tucumán' },
  { codigo: 'U', nombre: 'Chubut' },
  { codigo: 'V', nombre: 'Tierra del Fuego' },
  { codigo: 'W', nombre: 'Corrientes' },
  { codigo: 'X', nombre: 'Córdoba' },
  { codigo: 'Y', nombre: 'Jujuy' },
  { codigo: 'Z', nombre: 'Santa Cruz' },
];

export const CODIGOS_PROVINCIA_VALIDOS: ProvinciaCodigo[] = PROVINCIAS.map(p => p.codigo);

export function esCodigoProvinciaValido(codigo: string): codigo is ProvinciaCodigo {
  return (CODIGOS_PROVINCIA_VALIDOS as string[]).includes(codigo);
}
