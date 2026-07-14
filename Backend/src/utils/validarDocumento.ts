import { AppError } from '../errors/AppError';
import type { TipoDocumento } from '../types';

const LONGITUDES: Record<TipoDocumento, { min: number; max: number }> = {
  DNI:  { min: 7, max: 8 },
  CUIT: { min: 11, max: 11 },
};

export function validarDocumento(tipo: TipoDocumento, numero: string): void {
  const soloDigitos = numero.replace(/\D/g, '');
  const { min, max } = LONGITUDES[tipo];
  if (soloDigitos.length < min || soloDigitos.length > max) {
    throw new AppError(`${tipo} inválido: debe tener ${min === max ? min : `entre ${min} y ${max}`} dígitos`, 400);
  }
}
