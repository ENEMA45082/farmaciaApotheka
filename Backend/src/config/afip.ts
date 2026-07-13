import fs from 'fs';
import Afip from '@afipsdk/afip.js';

// Permite pasar el cert/key como contenido directo (ARCA_CERT/ARCA_KEY, usado en
// Vercel) o como ruta a un archivo local (ARCA_CERT_PATH/ARCA_KEY_PATH, más cómodo
// para desarrollo). El contenido directo tiene prioridad si están ambos.
function leerCertOClave(contenido?: string, ruta?: string): string | undefined {
  if (contenido) return contenido;
  if (ruta) return fs.readFileSync(ruta, 'utf-8');
  return undefined;
}

const CUIT = process.env.ARCA_CUIT;
const ACCESS_TOKEN = process.env.ARCA_ACCESS_TOKEN;
const CERT = leerCertOClave(process.env.ARCA_CERT, process.env.ARCA_CERT_PATH);
const KEY = leerCertOClave(process.env.ARCA_KEY, process.env.ARCA_KEY_PATH);

export const afipConfigurado = !!(CUIT && ACCESS_TOKEN);
export const PUNTO_VENTA_ARCA = Number(process.env.ARCA_PUNTO_VENTA ?? 1);

export const afip = afipConfigurado
  ? new Afip({
      CUIT: Number(CUIT),
      access_token: ACCESS_TOKEN as string,
      ...(CERT && KEY ? { cert: CERT, key: KEY, production: process.env.ARCA_PRODUCCION === 'true' } : {}),
    })
  : null;
