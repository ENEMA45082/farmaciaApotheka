// Duplicado a mano de Backend/src/utils/validarDocumento.ts — mantener en
// sync si cambia el algoritmo. Acá se usa para el chequeo del lado del
// cliente antes de guardar; el backend siempre vuelve a validar de forma
// autoritativa.

const PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

// Algoritmo oficial del dígito verificador de CUIT/CUIL (módulo 11).
// Devuelve null cuando la base no tiene un dígito verificador válido (resto 10).
function calcularDigitoVerificadorCuit(primerosDiez: string): number | null {
  const suma = primerosDiez
    .split('')
    .reduce((acc, digito, i) => acc + Number(digito) * PESOS_CUIT[i], 0);
  const verificador = 11 - (suma % 11);
  if (verificador === 11) return 0;
  if (verificador === 10) return null;
  return verificador;
}

export function esCuitValido(cuit: string): boolean {
  const soloDigitos = cuit.replace(/\D/g, '');
  if (soloDigitos.length !== 11) return false;
  const digitoEsperado = calcularDigitoVerificadorCuit(soloDigitos.slice(0, 10));
  return digitoEsperado !== null && digitoEsperado === Number(soloDigitos[10]);
}

// El bloque central de un CUIT (posiciones 3 a 10) es el DNI de la persona,
// rellenado a la izquierda con un cero si el DNI tiene 7 dígitos.
export function extraerDniDeCuit(cuit: string): string {
  const soloDigitos = cuit.replace(/\D/g, '');
  if (soloDigitos.length !== 11) return cuit;
  return soloDigitos.slice(2, 10).replace(/^0+/, '') || '0';
}
