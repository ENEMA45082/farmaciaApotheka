import fs from 'fs';
import path from 'path';
import { afipProduccion, afipProduccionConfigurado } from '../config/afipProduccion';
import { AppError } from '../errors/AppError';

/**
 * ⚠️ Servicio del ambiente de PRODUCCIÓN de ARCA (ver advertencia completa en
 * `../config/afipProduccion.ts`). A propósito NO hay ninguna función acá que
 * llame a `FECAESolicitar` todavía — se agrega recién cuando el usuario lo
 * confirme explícitamente, paso por paso, en esta misma sesión.
 */

// Punto de venta EXCLUSIVO para la emisión web, dado de alta en ARCA el
// 2026-07-13. Es DISTINTO del punto de venta 5 (usado por MercadoLibre) —
// nunca usar el 5 acá.
export const PUNTO_VENTA_WEB_PRODUCCION = 6;

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

function fechaAfip(fecha: Date): number {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return Number(`${y}${m}${d}`);
}

function fechaDDMMYYYY(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${d}/${m}/${y}`;
}

// Convierte 'YYYY-MM-DD' (formato que devuelve ARCA para CAEFchVto) a 'DD/MM/YYYY'
function isoADDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export async function verificarConexionProduccion() {
  if (!afipProduccionConfigurado || !afipProduccion) {
    throw new AppError(
      'ARCA producción no está configurado: falta ARCA_ENVIRONMENT=produccion o alguna de '
        + 'ARCA_PROD_CUIT / ARCA_ACCESS_TOKEN / ARCA_PROD_CERT(_PATH) / ARCA_PROD_KEY(_PATH)',
      503,
    );
  }

  // FEDummy: solo consulta el estado de los web services de ARCA. No requiere
  // parámetros y no toca numeración de comprobantes.
  const estado = await afipProduccion.ElectronicBilling.getServerStatus();

  return {
    cuit: process.env.ARCA_PROD_CUIT,
    appServer: estado.AppServer,
    dbServer: estado.DbServer,
    authServer: estado.AuthServer,
  };
}

// Consulta de solo lectura (FECompUltimoAutorizado): no emite ningún comprobante.
// puntoVenta/tipoComprobante son obligatorios (sin default) a propósito, para que
// nunca quede ambiguo cuál punto de venta se está consultando en producción.
export async function obtenerUltimoComprobanteProduccion(puntoVenta: number, tipoComprobante: number) {
  if (!afipProduccionConfigurado || !afipProduccion) {
    throw new AppError(
      'ARCA producción no está configurado: falta ARCA_ENVIRONMENT=produccion o alguna de '
        + 'ARCA_PROD_CUIT / ARCA_ACCESS_TOKEN / ARCA_PROD_CERT(_PATH) / ARCA_PROD_KEY(_PATH)',
      503,
    );
  }

  const ultimoNumero = await afipProduccion.ElectronicBilling.getLastVoucher(puntoVenta, tipoComprobante);
  return { puntoVenta, tipoComprobante, ultimoNumero };
}

export interface DatosComprobanteProduccion {
  puntoVenta: number;
  tipoComprobante: number;
  importeTotal: number;
  docTipo: number;
  docNro: number;
}

/**
 * ⚠️ FECAESolicitar CONTRA ARCA PRODUCCIÓN REAL. Genera un comprobante fiscal
 * REAL e IRREVERSIBLE y consume numeración oficial de ARCA. Todos los campos
 * son obligatorios (sin default) a propósito: nunca debe quedar ambigüedad
 * sobre qué se está emitiendo en producción. Requiere confirmación explícita
 * del usuario antes de invocarse (ver `testAfipProduccion.routes.ts`).
 */
export async function solicitarComprobanteProduccion(datos: DatosComprobanteProduccion) {
  if (!afipProduccionConfigurado || !afipProduccion) {
    throw new AppError(
      'ARCA producción no está configurado: falta ARCA_ENVIRONMENT=produccion o alguna de '
        + 'ARCA_PROD_CUIT / ARCA_ACCESS_TOKEN / ARCA_PROD_CERT(_PATH) / ARCA_PROD_KEY(_PATH)',
      503,
    );
  }

  const { puntoVenta, tipoComprobante, docTipo, docNro } = datos;
  const importeTotal = redondear(datos.importeTotal);

  const ultimoNumeroAnterior = await afipProduccion.ElectronicBilling.getLastVoucher(puntoVenta, tipoComprobante);
  const numeroComprobante = ultimoNumeroAnterior + 1;

  const neto = redondear(importeTotal / 1.21);
  const iva = redondear(importeTotal - neto);

  const data = {
    CantReg: 1,
    PtoVta: puntoVenta,
    CbteTipo: tipoComprobante,
    Concepto: 1, // productos
    DocTipo: docTipo,
    DocNro: docNro,
    CbteDesde: numeroComprobante,
    CbteHasta: numeroComprobante,
    CbteFch: fechaAfip(new Date()),
    ImpTotal: importeTotal,
    ImpTotConc: 0,
    ImpNeto: neto,
    ImpOpEx: 0,
    ImpIVA: iva,
    ImpTrib: 0,
    MonId: 'PES',
    MonCotiz: 1,
    CondicionIVAReceptorId: 5, // Consumidor Final (condición del RECEPTOR, no de Apotheka SRL)
    Iva: [{ Id: 5, BaseImp: neto, Importe: iva }], // Id 5 = alícuota 21% en el padrón de ARCA
  };

  const resultado = await afipProduccion.ElectronicBilling.createVoucher(data);

  return {
    puntoVenta,
    tipoComprobante,
    ultimoNumeroAnterior,
    numeroComprobante,
    importeTotal,
    cae: resultado.CAE,
    caeVencimiento: resultado.CAEFchVto,
  };
}

const CARPETA_PDFS_PRODUCCION = path.join(__dirname, '..', '..', 'secrets', 'facturas-produccion');

export interface DatosPdfFacturaProduccion {
  puntoVenta: number;
  tipoComprobante: number;
  numeroComprobante: number;
  cae: string;
  caeVencimiento: string; // 'YYYY-MM-DD', como lo devuelve ARCA
  fechaEmision: Date;
  importeNeto: number;
  importeIva: number;
  importeTotal: number;
  docTipo: number;
  docNro: number;
}

/**
 * Genera el PDF de un comprobante que YA fue emitido (no llama a FECAESolicitar,
 * no consume numeración). Pensada para un comprobante puntual ya existente: todos
 * los datos (CAE, número, importes) se pasan explícitos, no se recalculan.
 *
 * AfipSDK guarda el PDF generado solo 24hs en su servidor — por eso esta función
 * siempre descarga y guarda una copia local en `secrets/facturas-produccion/`
 * (carpeta ignorada por git) antes de devolver el resultado.
 */
export async function generarPdfFacturaProduccion(datos: DatosPdfFacturaProduccion) {
  if (!afipProduccionConfigurado || !afipProduccion) {
    throw new AppError(
      'ARCA producción no está configurado: falta ARCA_ENVIRONMENT=produccion o alguna de '
        + 'ARCA_PROD_CUIT / ARCA_ACCESS_TOKEN / ARCA_PROD_CERT(_PATH) / ARCA_PROD_KEY(_PATH)',
      503,
    );
  }

  const nombreArchivo = `factura-B-pv${datos.puntoVenta}-nro${datos.numeroComprobante}.pdf`;

  const data = {
    file_name: nombreArchivo,
    template: {
      name: 'invoice-b',
      params: {
        voucher_number: datos.numeroComprobante,
        sales_point: datos.puntoVenta,
        issue_date: fechaDDMMYYYY(datos.fechaEmision),
        cae_due_date: isoADDMMYYYY(datos.caeVencimiento),
        issuer_cuit: Number(process.env.ARCA_PROD_CUIT),
        cae: datos.cae,
        issuer_business_name: process.env.ARCA_RAZON_SOCIAL ?? '',
        issuer_address: process.env.ARCA_DOMICILIO_FISCAL ?? '',
        issuer_iva_condition: process.env.ARCA_CONDICION_IVA ?? 'Responsable Inscripto',
        issuer_gross_income: (process.env.ARCA_INGRESOS_BRUTOS ?? '').trim(),
        issuer_activity_start_date: process.env.ARCA_INICIO_ACTIVIDADES ?? '',
        receiver_name: 'CONSUMIDOR FINAL',
        receiver_address: '-',
        receiver_document_type: datos.docTipo,
        receiver_document_number: datos.docNro,
        receiver_iva_condition: 'Consumidor Final',
        sale_condition: 'Contado',
        currency_id: 'ARS',
        currency_rate: 1,
        concept: 1,
        items: [{
          code: '-',
          description: 'Comprobante de prueba - validación de emisión real',
          quantity: 1,
          unit_price: datos.importeNeto,
          subtotal: datos.importeNeto,
        }],
        vat_amount: datos.importeIva,
        tributes_amount: 0,
        total_amount: datos.importeTotal,
      },
    },
  };

  const resultado = await afipProduccion.ElectronicBilling.createPDF(data);

  const contenido: Buffer = /^https?:\/\//.test(resultado.file)
    ? Buffer.from(await (await fetch(resultado.file)).arrayBuffer())
    : Buffer.from(resultado.file, 'base64');

  fs.mkdirSync(CARPETA_PDFS_PRODUCCION, { recursive: true });
  const rutaGuardada = path.join(CARPETA_PDFS_PRODUCCION, nombreArchivo);
  fs.writeFileSync(rutaGuardada, contenido);

  return { buffer: contenido, nombreArchivo, rutaGuardada };
}
