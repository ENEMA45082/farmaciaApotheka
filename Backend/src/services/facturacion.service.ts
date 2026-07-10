import { afip, afipConfigurado, PUNTO_VENTA_ARCA } from '../config/afip';
import { supabase } from '../config/supabase';
import * as facturasRepo from '../repositories/facturas.repository';
import * as perfilRepo from '../repositories/perfil.repository';
import * as productosRepo from '../repositories/productos.repository';
import * as direccionesRepo from '../repositories/direcciones.repository';
import type { Pedido, Factura } from '../types';

const BUCKET_FACTURAS = 'Farmacia-Apotheka';

const CBTE_TIPO_FACTURA_B = 6;

// Códigos de alícuota de IVA según el padrón de ARCA (getAliquotTypes)
const ALICUOTA_A_ID: Record<string, number> = {
  '0':    3,
  '10.5': 4,
  '21':   5,
  '27':   6,
};

function idAlicuota(alicuota: number): number {
  return ALICUOTA_A_ID[String(alicuota)] ?? ALICUOTA_A_ID['21'];
}

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

async function calcularDesgloseIva(pedido: Pedido) {
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

async function generarPdfFactura(pedido: Pedido, factura: Factura): Promise<void> {
  if (!afip || !factura.cae || !factura.nro_comprobante || !factura.punto_venta) return;

  try {
    const [perfil, direccion, userResult] = await Promise.all([
      perfilRepo.encontrarOCrear(pedido.user_id).catch(() => null),
      pedido.metodo_envio === 'domicilio' ? direccionesRepo.obtener(pedido.user_id) : Promise.resolve(null),
      supabase.auth.admin.getUserById(pedido.user_id).catch(() => null),
    ]);

    const nombreCliente = perfil?.nombre || perfil?.apellido
      ? [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ')
      : 'CONSUMIDOR FINAL';
    const domicilioCliente = direccion
      ? `${direccion.calle} ${direccion.altura}, ${direccion.ciudad}, ${direccion.provincia}`
      : '-';
    const docTipo = perfil?.dni ? 96 : 99;
    const docNro = perfil?.dni ? Number(perfil.dni) : 0;
    const email = userResult?.data?.user?.email ?? undefined;

    const { ivaTotal } = await calcularDesgloseIva(pedido);

    const data = {
      file_name: `factura-${pedido.id}.pdf`,
      ...(email ? { send_to: email } : {}),
      template: {
        name: 'invoice-b',
        params: {
          voucher_number: factura.nro_comprobante,
          sales_point: factura.punto_venta,
          issue_date: fechaDDMMYYYY(new Date(factura.actualizado_en)),
          cae_due_date: factura.cae_vencimiento ? isoADDMMYYYY(factura.cae_vencimiento) : '',
          issuer_cuit: Number(process.env.ARCA_CUIT),
          cae: factura.cae,
          issuer_business_name: process.env.ARCA_RAZON_SOCIAL ?? '',
          issuer_address: process.env.ARCA_DOMICILIO_FISCAL ?? '',
          issuer_iva_condition: process.env.ARCA_CONDICION_IVA ?? 'Responsable Inscripto',
          issuer_gross_income: process.env.ARCA_INGRESOS_BRUTOS ?? '',
          issuer_activity_start_date: process.env.ARCA_INICIO_ACTIVIDADES ?? '',
          receiver_name: nombreCliente,
          receiver_address: domicilioCliente,
          receiver_document_type: docTipo,
          receiver_document_number: docNro,
          receiver_iva_condition: 'Consumidor Final',
          sale_condition: 'Contado',
          currency_id: 'ARS',
          currency_rate: 1,
          concept: 1,
          items: (pedido.detalles ?? []).map(d => ({
            code: d.producto_id ?? '-',
            description: d.nombre_producto,
            quantity: d.cantidad,
            unit_price: d.precio_unitario,
            subtotal: d.subtotal,
          })),
          vat_amount: ivaTotal,
          tributes_amount: 0,
          total_amount: redondear(pedido.total),
        },
      },
    };

    const resultado = await afip.ElectronicBilling.createPDF(data);

    const contenido: Buffer = /^https?:\/\//.test(resultado.file)
      ? Buffer.from(await (await fetch(resultado.file)).arrayBuffer())
      : Buffer.from(resultado.file, 'base64');

    const nombreArchivo = `facturas/${pedido.id}.pdf`;
    const { error: errorSubida } = await supabase.storage
      .from(BUCKET_FACTURAS)
      .upload(nombreArchivo, contenido, { contentType: 'application/pdf', upsert: true });
    if (errorSubida) throw errorSubida;

    const { data: publicUrlData } = supabase.storage.from(BUCKET_FACTURAS).getPublicUrl(nombreArchivo);

    await facturasRepo.actualizar(factura.id, { pdf_url: publicUrlData.publicUrl });
  } catch (err) {
    console.error(`[facturacion] Error generando PDF para pedido ${pedido.id}:`, err);
  }
}

export async function emitirFactura(pedido: Pedido): Promise<void> {
  if (!afipConfigurado || !afip) {
    console.log(`[facturacion] ARCA no configurado, se omite factura para pedido ${pedido.id}`);
    return;
  }

  const existente = await facturasRepo.encontrarPorPedidoId(pedido.id);
  if (existente?.estado === 'emitida') {
    if (!existente.pdf_url) await generarPdfFactura(pedido, existente);
    return;
  }

  const factura = existente ?? await facturasRepo.crear(pedido.id);

  try {
    const perfil = await perfilRepo.encontrarOCrear(pedido.user_id);
    const { netoTotal, ivaTotal, ivaPorAlicuota } = await calcularDesgloseIva(pedido);

    const docTipo = perfil.dni ? 96 : 99;
    const docNro = perfil.dni ? Number(perfil.dni) : 0;

    const data = {
      CantReg: 1,
      PtoVta: PUNTO_VENTA_ARCA,
      CbteTipo: CBTE_TIPO_FACTURA_B,
      Concepto: 1, // productos
      DocTipo: docTipo,
      DocNro: docNro,
      CbteFch: fechaAfip(new Date()),
      ImpTotal: redondear(pedido.total),
      ImpTotConc: 0,
      ImpNeto: netoTotal,
      ImpOpEx: 0,
      ImpIVA: ivaTotal,
      ImpTrib: 0,
      MonId: 'PES',
      MonCotiz: 1,
      CondicionIVAReceptorId: 5, // Consumidor Final
      Iva: ivaPorAlicuota,
    };

    const resultado = await afip.ElectronicBilling.createNextVoucher(data);

    const facturaActualizada = await facturasRepo.actualizar(factura.id, {
      estado: 'emitida',
      tipo_comprobante: CBTE_TIPO_FACTURA_B,
      punto_venta: PUNTO_VENTA_ARCA,
      nro_comprobante: resultado.voucherNumber,
      cae: resultado.CAE,
      cae_vencimiento: resultado.CAEFchVto,
      importe_total: pedido.total,
    });

    if (facturaActualizada) await generarPdfFactura(pedido, facturaActualizada);
  } catch (err) {
    await facturasRepo.actualizar(factura.id, {
      estado: 'error',
      respuesta_error: err instanceof Error ? err.message : String(err),
      incrementarIntentos: true,
    });
    console.error(`[facturacion] Error emitiendo factura para pedido ${pedido.id}:`, err);
  }
}
