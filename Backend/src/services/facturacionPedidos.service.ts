import { obtenerClienteArca } from '../config/afipEnvironment';
import { supabase } from '../config/supabase';
import * as facturasRepo from '../repositories/facturas.repository';
import * as perfilRepo from '../repositories/perfil.repository';
import * as direccionesRepo from '../repositories/direcciones.repository';
import { calcularDesgloseIva, CBTE_TIPO_FACTURA_B, redondear, fechaAfip } from './facturacion.service';
import type { Pedido, Factura } from '../types';

/**
 * Orquestación real de facturación electrónica para el flujo de pedidos.
 * Elige homologación o producción según `ARCA_ENVIRONMENT` (ver
 * `../config/afipEnvironment.ts`). Se dispara únicamente cuando un pedido pasa
 * a `Entregado` (ver `pedidos.service.ts::cambiarEstado`), nunca antes.
 */

const BUCKET_FACTURAS = 'Farmacia-Apotheka';

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

// AFIP DocTipo: 80 = CUIT, 96 = DNI
function docTipoAfip(tipo: 'DNI' | 'CUIT'): number {
  return tipo === 'CUIT' ? 80 : 96;
}

async function generarPdfFactura(pedido: Pedido, factura: Factura): Promise<void> {
  const { afip, cuit } = obtenerClienteArca();
  if (!afip || !factura.cae || !factura.nro_comprobante || !factura.punto_venta) return;
  if (!factura.receptor_doc_tipo || factura.receptor_doc_nro == null) return;

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
          issuer_cuit: Number(cuit),
          cae: factura.cae,
          issuer_business_name: process.env.ARCA_RAZON_SOCIAL ?? '',
          issuer_address: process.env.ARCA_DOMICILIO_FISCAL ?? '',
          issuer_iva_condition: process.env.ARCA_CONDICION_IVA ?? 'Responsable Inscripto',
          issuer_gross_income: process.env.ARCA_INGRESOS_BRUTOS ?? '',
          issuer_activity_start_date: process.env.ARCA_INICIO_ACTIVIDADES ?? '',
          receiver_name: nombreCliente,
          receiver_address: domicilioCliente,
          receiver_document_type: factura.receptor_doc_tipo,
          receiver_document_number: factura.receptor_doc_nro,
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
    console.error(`[facturacionPedidos] Error generando PDF para pedido ${pedido.id}:`, err);
  }
}

export async function emitirFactura(pedido: Pedido): Promise<void> {
  const { afip, configurado, puntoVenta, ambiente } = obtenerClienteArca();
  if (!configurado || !afip) {
    console.log(`[facturacionPedidos] ARCA (${ambiente}) no configurado, se omite factura para pedido ${pedido.id}`);
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

    // Nunca facturar "como Consumidor Final" en silencio si falta el documento.
    // El checkout (Frontend) exige perfil.dni cargado antes de poder comprar,
    // pero esto cubre pedidos previos a ese cambio: quedan en 'error', visibles
    // en el flujo de reintento manual (POST /api/pedidos/:id/reintentar-factura).
    if (!perfil.dni) {
      await facturasRepo.actualizar(factura.id, {
        estado: 'error',
        respuesta_error: 'Falta DNI/CUIT del comprador en su perfil',
        incrementarIntentos: true,
      });
      return;
    }

    const { netoTotal, ivaTotal, ivaPorAlicuota } = await calcularDesgloseIva(pedido);
    const docTipo = docTipoAfip(perfil.documento_tipo);
    const docNro = Number(perfil.dni);

    const data = {
      CantReg: 1,
      PtoVta: puntoVenta,
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
      // Simplificación deliberada de esta fase: se factura siempre como
      // Consumidor Final aunque el receptor haya cargado CUIT. Factura A
      // (que requeriría distinguir la condición de IVA real del receptor)
      // queda para una fase futura.
      CondicionIVAReceptorId: 5,
      Iva: ivaPorAlicuota,
    };

    const resultado = await afip.ElectronicBilling.createNextVoucher(data);

    const facturaActualizada = await facturasRepo.actualizar(factura.id, {
      estado: 'emitida',
      tipo_comprobante: CBTE_TIPO_FACTURA_B,
      punto_venta: puntoVenta,
      nro_comprobante: resultado.voucherNumber,
      cae: resultado.CAE,
      cae_vencimiento: resultado.CAEFchVto,
      importe_total: pedido.total,
      receptor_doc_tipo: docTipo,
      receptor_doc_nro: docNro,
    });

    if (facturaActualizada) await generarPdfFactura(pedido, facturaActualizada);
  } catch (err) {
    await facturasRepo.actualizar(factura.id, {
      estado: 'error',
      respuesta_error: err instanceof Error ? err.message : String(err),
      incrementarIntentos: true,
    });
    console.error(`[facturacionPedidos] Error emitiendo factura para pedido ${pedido.id}:`, err);
  }
}
