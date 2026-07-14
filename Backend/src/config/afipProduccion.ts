import fs from 'fs';
import Afip from '@afipsdk/afip.js';

/**
 * ============================================================================
 * ⚠️  ARCA / AFIP SDK — AMBIENTE DE PRODUCCIÓN (CUIT 30677539743, Apotheka SRL)
 * ============================================================================
 * Este archivo conecta con los servidores REALES de ARCA. Cualquier llamada a
 * `FECAESolicitar` (createVoucher/createNextVoucher) hecha con el cliente
 * `afipProduccion` genera un comprobante fiscal REAL e IRREVERSIBLE: consume
 * numeración oficial y tiene validez legal. No existe (todavía) ninguna función
 * de emisión que use este cliente — solo `FEDummy` (chequeo de estado, de solo
 * lectura). Antes de agregar una función de emisión acá, pensarlo dos veces.
 *
 * Completamente separado del cliente de homologación (`./afip.ts`, CUIT de
 * testing): no comparten código ni variables de entorno.
 * ============================================================================
 */

// Igual que en homologación: contenido directo (Base64, pensado para pegar en
// Vercel sin arriesgar saltos de línea) o ruta a archivo local (PEM crudo, para
// desarrollo). El contenido directo tiene prioridad si están ambos.
function leerCertOClaveProduccion(base64?: string, ruta?: string): string | undefined {
  if (base64) return Buffer.from(base64, 'base64').toString('utf-8');
  if (ruta) return fs.readFileSync(ruta, 'utf-8');
  return undefined;
}

const CUIT = process.env.ARCA_PROD_CUIT;
const ACCESS_TOKEN = process.env.ARCA_ACCESS_TOKEN; // misma cuenta de afipsdk.com que homologación
const CERT = leerCertOClaveProduccion(process.env.ARCA_PROD_CERT, process.env.ARCA_PROD_CERT_PATH);
const KEY = leerCertOClaveProduccion(process.env.ARCA_PROD_KEY, process.env.ARCA_PROD_KEY_PATH);

// Doble gate a propósito: no alcanza con tener las credenciales cargadas, hace
// falta ADEMÁS poner ARCA_ENVIRONMENT=produccion explícitamente. Nunca es un
// default silencioso.
export const afipProduccionConfigurado =
  process.env.ARCA_ENVIRONMENT === 'produccion' && !!(CUIT && ACCESS_TOKEN && CERT && KEY);

export const afipProduccion = afipProduccionConfigurado
  ? new Afip({
      CUIT: Number(CUIT),
      access_token: ACCESS_TOKEN as string,
      cert: CERT,
      key: KEY,
      production: true,
    })
  : null;
