import Afip from '@afipsdk/afip.js';

const CUIT = process.env.ARCA_CUIT;
const ACCESS_TOKEN = process.env.ARCA_ACCESS_TOKEN;
const CERT = process.env.ARCA_CERT;
const KEY = process.env.ARCA_KEY;

export const afipConfigurado = !!(CUIT && ACCESS_TOKEN);
export const PUNTO_VENTA_ARCA = Number(process.env.ARCA_PUNTO_VENTA ?? 1);

export const afip = afipConfigurado
  ? new Afip({
      CUIT: Number(CUIT),
      access_token: ACCESS_TOKEN as string,
      ...(CERT && KEY ? { cert: CERT, key: KEY, production: process.env.ARCA_PRODUCCION === 'true' } : {}),
    })
  : null;
