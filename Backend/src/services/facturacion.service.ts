import { afip, afipConfigurado, PUNTO_VENTA_ARCA } from '../config/afip';
import { AppError } from '../errors/AppError';
import * as productosRepo from '../repositories/productos.repository';
import type { Pedido } from '../types';

/**
 * Helpers de HOMOLOGACIÓN: uso puro (`calcularDesgloseIva`) o de testing manual
 * (`obtenerUltimoComprobanteAutorizado`, `solicitarComprobantePrueba`, usados por
 * `testAfip.routes.ts`). La orquestación real de facturación de pedidos (que sí
 * elige homologación o producción según `ARCA_ENVIRONMENT`) vive en
 * `facturacionPedidos.service.ts` — este archivo se mantiene fijo a homologación
 * a propósito, no tocar su comportamiento.
 */

export const CBTE_TIPO_FACTURA_B = 6;

// Códigos de alícuota de IVA según el padrón de ARCA (getAliquotTypes)
const ALICUOTA_A_ID: Record<string, number> = {
  '0':    3,
  '10.5': 4,
  '21':   5,
  '27':   6,
};

export function idAlicuota(alicuota: number): number {
  return ALICUOTA_A_ID[String(alicuota)] ?? ALICUOTA_A_ID['21'];
}

export function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

export function fechaAfip(fecha: Date): number {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return Number(`${y}${m}${d}`);
}

export async function calcularDesgloseIva(pedido: Pedido) {
  const porAlicuota = new Map<number, { alicuota: number; neto: number; iva: number }>();

  for (const detalle of pedido.detalles ?? []) {
    let alicuota = 21;
    if (detalle.producto_id) {
      const producto = await productosRepo.encontrarPorId(detalle.producto_id);
      if (producto) alicuota = producto.alicuota_iva;
    }

    const neto = detalle.subtotal / (1 + alicuota / 100);
    const iva = detalle.subtotal - neto;

    const acumulado = porAlicuota.get(alicuota) ?? { alicuota, neto: 0, iva: 0 };
    acumulado.neto += neto;
    acumulado.iva += iva;
    porAlicuota.set(alicuota, acumulado);
  }

  const grupos = [...porAlicuota.values()];
  const netoTotal = grupos.reduce((s, g) => s + g.neto, 0);
  const ivaTotal = grupos.reduce((s, g) => s + g.iva, 0);

  return {
    netoTotal: redondear(netoTotal),
    ivaTotal: redondear(ivaTotal),
    ivaPorAlicuota: grupos.map(g => ({
      Id: idAlicuota(g.alicuota),
      BaseImp: redondear(g.neto),
      Importe: redondear(g.iva),
    })),
  };
}

// Consulta de solo lectura (FECompUltimoAutorizado): no emite ningún comprobante.
// Sirve para validar la conexión a ARCA/AfipSDK antes de emitir facturas reales.
export async function obtenerUltimoComprobanteAutorizado(
  puntoVenta: number = PUNTO_VENTA_ARCA,
  tipoComprobante: number = CBTE_TIPO_FACTURA_B,
) {
  if (!afipConfigurado || !afip) {
    throw new AppError(
      'ARCA/AfipSDK no está configurado: faltan ARCA_CUIT o ARCA_ACCESS_TOKEN en las variables de entorno',
      503,
      'ARCA_NO_CONFIGURADO',
    );
  }

  const ultimoNumero = await afip.ElectronicBilling.getLastVoucher(puntoVenta, tipoComprobante);
  return { puntoVenta, tipoComprobante, ultimoNumero };
}

export interface DatosComprobantePrueba {
  puntoVenta?: number;
  tipoComprobante?: number;
  importeTotal?: number;
  docTipo?: number;
  docNro?: number;
}

// Solicita un CAE real (FECAESolicitar) para un comprobante suelto, sin depender de
// un pedido. Hace explícitos los dos pasos del flujo (consultar último autorizado,
// pedir CAE para ese número + 1) para poder validar la integración de punta a punta
// antes de conectarla con el flujo de pedidos/facturas.
export async function solicitarComprobantePrueba(opciones: DatosComprobantePrueba = {}) {
  if (!afipConfigurado || !afip) {
    throw new AppError(
      'ARCA/AfipSDK no está configurado: faltan ARCA_CUIT o ARCA_ACCESS_TOKEN en las variables de entorno',
      503,
      'ARCA_NO_CONFIGURADO',
    );
  }

  const puntoVenta = opciones.puntoVenta ?? PUNTO_VENTA_ARCA;
  const tipoComprobante = opciones.tipoComprobante ?? CBTE_TIPO_FACTURA_B;
  const importeTotal = redondear(opciones.importeTotal ?? 121);
  const docTipo = opciones.docTipo ?? 99; // Consumidor Final
  const docNro = opciones.docNro ?? 0;

  const ultimoNumeroAnterior = await afip.ElectronicBilling.getLastVoucher(puntoVenta, tipoComprobante);
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
    CondicionIVAReceptorId: 5, // Consumidor Final
    Iva: [{ Id: idAlicuota(21), BaseImp: neto, Importe: iva }],
  };

  const resultado = await afip.ElectronicBilling.createVoucher(data);

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
