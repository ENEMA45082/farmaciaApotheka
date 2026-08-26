import { AppError } from '../errors/AppError';
import type { TipoDocumento } from '../types';

const LONGITUDES: Record<TipoDocumento, { min: number; max: number }> = {
  DNI:  { min: 7, max: 8 },
  CUIT: { min: 11, max: 11 },
};

const PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

// Algoritmo oficial del dígito verificador de CUIT/CUIL (módulo 11).
// Devuelve null cuando la base no tiene un dígito verificador válido
// (resto 10) — en ese caso el CUIT es inválido sin importar qué dígito
// traiga al final.
function calcularDigitoVerificadorCuit(primerosDiez: string): number | null {
  const suma = primerosDiez
    .split('')
    .reduce((acc, digito, i) => acc + Number(digito) * PESOS_CUIT[i], 0);
  const verificador = 11 - (suma % 11);
  if (verificador === 11) return 0;
  if (verificador === 10) return null;
  return verificador;
}

// El bloque central de un CUIT (posiciones 3 a 10) es el DNI de la persona,
// rellenado a la izquierda con un cero si el DNI tiene 7 dígitos. Se usa
// para poder seguir identificando a alguien por DNI aunque el perfil haya
// guardado un CUIT (ver perfil.repository.ts::encontrarPorDni y
// EnvioPage.tsx::handleEsYoToggle en el frontend).
export function extraerDniDeCuit(cuit: string): string {
  const soloDigitos = cuit.replace(/\D/g, '');
  if (soloDigitos.length !== 11) return cuit;
  return soloDigitos.slice(2, 10).replace(/^0+/, '') || '0';
}

export function validarDocumento(tipo: TipoDocumento, numero: string): void {
  const soloDigitos = numero.replace(/\D/g, '');
  const { min, max } = LONGITUDES[tipo];
  if (soloDigitos.length < min || soloDigitos.length > max) {
    throw new AppError(`${tipo} inválido: debe tener ${min === max ? min : `entre ${min} y ${max}`} dígitos`, 400, 'INVALID_DOCUMENTO');
  }

  if (tipo === 'CUIT') {
    const digitoEsperado = calcularDigitoVerificadorCuit(soloDigitos.slice(0, 10));
    if (digitoEsperado === null || digitoEsperado !== Number(soloDigitos[10])) {
      throw new AppError('CUIT inválido: el dígito verificador no coincide', 400, 'INVALID_DOCUMENTO');
    }
  }
}
