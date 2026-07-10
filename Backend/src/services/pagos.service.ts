// eslint-disable-next-line @typescript-eslint/no-require-imports
const sdkPayway = require('sdk-node-payway') as {
  sdk: new (
    environment: string,
    publicKey: string,
    privateKey: string,
    grouper: string,
    developer: string,
  ) => {
    payment:  (args: Record<string, unknown>, cb: (result: any, err: any) => void) => void;
    checkout: (args: Record<string, unknown>, cb: (result: any, err: any) => void) => void;
  };
};

import * as pedidosRepo   from '../repositories/pedidos.repository';
import * as productosRepo from '../repositories/productos.repository';
import * as facturacionService from './facturacion.service';
import type { Pedido, FraudData } from '../types';

function crearSDK() {
  const env = process.env.PAYWAY_ENVIRONMENT ?? 'developer';
  const pub = process.env.PAYWAY_PUBLIC_KEY  ?? '';
  const prv = process.env.PAYWAY_PRIVATE_KEY ?? '';
  console.log(`[Payway] crearSDK env=${env} pub=${pub.slice(0,8)}... prv=${prv.slice(0,8)}...`);
  return new sdkPayway.sdk(
    env,
    pub,
    prv,
    process.env.PAYWAY_MERCHANT_ID ?? 'Farmacia Apotheka',
    process.env.PAYWAY_DEVELOPER   ?? 'apotheka-dev',
  );
}

const paywaySDK = crearSDK();

function buildFraudDetection(pedido: Pedido, fraudData: FraudData, amountCentavos: number) {
  const dispatchMethod = pedido.metodo_envio === 'domicilio' ? 'homeDelivery' : 'store';
  const diasEntrega    = pedido.metodo_envio === 'domicilio' ? 5 : 0;

  const addressData = {
    city:         fraudData.ciudad,
    country:      'AR',
    email:        fraudData.email,
    first_name:   fraudData.nombre  || 'Cliente',
    last_name:    fraudData.apellido || 'Apotheka',
    phone_number: (fraudData.telefono || '1100000000').replace(/\D/g, ''),
    postal_code:  fraudData.codigoPostal || '1000',
    state:        fraudData.provincia.substring(0, 2).toUpperCase(),
    street1:      fraudData.street1 || 'Sin dirección',
  };

  return {
    send_to_cs:       true,
    channel:          'web',
    device_unique_id: pedido.id,
    bill_to: {
      ...addressData,
      customer_id: fraudData.userId,
    },
    purchase_totals: {
      currency: 'ARS',
      amount:   amountCentavos,
    },
    customer_in_site: {
      days_in_site:        0,
      is_guest:            false,
      num_of_transactions: 0,
    },
    retail_transaction_data: {
      ship_to:          addressData,
      dispatch_method:  dispatchMethod,
      days_to_delivery: diasEntrega,
      items: (pedido.detalles ?? []).map(d => ({
        code:         d.producto_id ?? 'PROD',
        name:         d.nombre_producto.substring(0, 255),
        description:  d.nombre_producto.substring(0, 255),
        sku:          d.producto_id ?? 'SKU',
        total_amount: Math.round(d.precio_unitario * d.cantidad * 100),
        unit_price:   Math.round(d.precio_unitario * 100),
        quantity:     d.cantidad,
      })),
    },
  };
}

export async function procesarPago(
  pedido: Pedido,
  token: string,
  bin: string,
  cuotas: number,
  paymentMethodId: number,
  fraudData: FraudData,
): Promise<{ status: string; pw_payment_id: string }> {
  const amountCentavos = Math.round(pedido.total * 100);

  const pagoResult = await new Promise<{ status: string; pw_payment_id: string }>((resolve, reject) => {
    paywaySDK.payment(
      {
        site_transaction_id: pedido.id,
        token,
        payment_method_id:   paymentMethodId,
        bin,
        amount:              amountCentavos,
        currency:            'ARS',
        installments:        cuotas,
        description:         'Farmacia Apotheka',
        payment_type:        'single',
        sub_payments:        [],
        fraud_detection:     buildFraudDetection(pedido, fraudData, amountCentavos),
      },
      (result: any, err: any) => {
        console.log('[Payway pagar] result:', JSON.stringify(result));
        console.log('[Payway pagar] err:', JSON.stringify(err));
        if (!result && err) return reject(new Error(JSON.stringify(err)));
        resolve({ status: String(result.status), pw_payment_id: String(result.id) });
      },
    );
  });

  if (pagoResult.status === 'approved') {
    await pedidosRepo.actualizarEstado(pedido.id, 'Confirmado', { pw_payment_id: pagoResult.pw_payment_id });
    await facturacionService.emitirFactura(pedido).catch(err => console.error('[facturacion]', err));
  } else if (pagoResult.status === 'rejected' || pagoResult.status === 'cancelled') {
    if (pedido.estado === 'PendienteDePago') {
      const motivo = pagoResult.status === 'rejected' ? 'pago_rechazado' : 'solicitado_por_cliente';
      await pedidosRepo.actualizarEstado(pedido.id, 'Cancelado', { motivo_cancelacion: motivo });
      for (const detalle of pedido.detalles ?? []) {
        if (detalle.producto_id) {
          await productosRepo.restaurarStock(detalle.producto_id, detalle.cantidad);
        }
      }
    }
  }

  return pagoResult;
}

export async function generarCheckoutHosted(
  pedido: Pedido,
  items: { nombre: string; precio: number; cantidad: number }[],
): Promise<string> {
  const env      = process.env.PAYWAY_ENVIRONMENT ?? 'developer';
  const siteId   = process.env.PAYWAY_SITE_ID     ?? '';
  const templateId = Number(process.env.PAYWAY_TEMPLATE_ID ?? '1');
  const frontUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const backUrl  = process.env.BACKEND_URL  ?? 'http://localhost:3001';

  // Payway rechaza URLs de localhost — usar la URL pública del frontend cuando se corre localmente
  const publicFrontUrl = process.env.FRONTEND_PUBLIC_URL ?? frontUrl;
  const esLocal        = frontUrl.includes('localhost') || frontUrl.includes('127.0.0.1');
  const baseUrl        = esLocal ? publicFrontUrl : frontUrl;
  const successUrl     = `${baseUrl}/pago/exitoso?pedido=${pedido.id}`;
  const cancelUrl      = `${baseUrl}/pago/cancelado?pedido=${pedido.id}`;
  // Payway requiere notifications_url — cuando el backend corre en localhost usar la URL pública desplegada
  const publicBackUrl = process.env.BACKEND_PUBLIC_URL ?? backUrl;
  const notifUrl      = `${publicBackUrl}/api/pagos/notificacion`;

  const productosPayway = items.map((item, idx) => ({
    id:          idx + 1,
    value:       item.precio,
    description: item.nombre,
    quantity:    item.cantidad,
  }));

  // Payway exige que total_price === suma de (value × quantity) de todos los productos.
  // El costo de envío se agrega como ítem separado para que los números cuadren.
  if (pedido.costo_envio > 0) {
    productosPayway.push({
      id:          productosPayway.length + 1,
      value:       pedido.costo_envio,
      description: 'Costo de envío',
      quantity:    1,
    });
  }

  const args: Record<string, unknown> = {
    origin_platform:     'SDK-Node',
    currency:            'ARS',
    site_transaction_id: pedido.id, // permite identificar el pedido en la notificación webhook
    products:            productosPayway,
    total_price:      pedido.total,
    site:             siteId,
    success_url:      successUrl,
    cancel_url:       cancelUrl,
    notifications_url: notifUrl,
    template_id:      templateId,
    installments:     [1],
    plan_gobierno:    false,
    public_apikey:    process.env.PAYWAY_PUBLIC_KEY ?? '',
    auth_3ds:         false,
  };

  console.log(`[Payway checkout] templateId=${templateId} siteId=${siteId} env=${env} esLocal=${esLocal}`);
  console.log('[Payway checkout] args:', JSON.stringify(args));

  return new Promise<string>((resolve, reject) => {
    paywaySDK.checkout(args, (result: any, err: any) => {
      console.log('[Payway checkout] result:', JSON.stringify(result));
      console.log('[Payway checkout] err:',    JSON.stringify(err));

      if (!result || result.error_type) {
        reject(new Error(`Payway checkout error: ${JSON.stringify(result ?? err)}`));
        return;
      }

      const paymentId = result?.payment_id ?? result?.id;
      const baseUrl   = env === 'production'
        ? 'https://live.decidir.com/web/checkout/'
        : 'https://developers.decidir.com/web/checkout/';
      const checkoutUrl = result?.checkout_url
        ?? result?.payment_link
        ?? (paymentId ? `${baseUrl}${paymentId}` : null);

      if (!checkoutUrl) {
        reject(new Error(`No se recibió URL de checkout. Respuesta: ${JSON.stringify(result)}`));
        return;
      }

      // Guardar el payment_id para poder identificar el pedido cuando llegue la notificación
      if (paymentId) {
        pedidosRepo.guardarPwPaymentId(pedido.id, String(paymentId)).catch(err =>
          console.error('[Payway checkout] Error guardando pw_payment_id:', err),
        );
      }

      resolve(checkoutUrl);
    });
  });
}

export async function procesarNotificacion(body: Record<string, unknown>): Promise<void> {
  const paymentId  = String(body.id ?? body.payment_id ?? '');
  const siteTxId   = String(body.site_transaction_id ?? '');
  const status     = String(body.status ?? '');

  if (!status || (!paymentId && !siteTxId)) return;

  // Intentar encontrar el pedido por site_transaction_id (= pedido.id) primero,
  // con fallback a pw_payment_id para pagos directos con token
  let pedido = null;
  if (siteTxId) {
    pedido = await pedidosRepo.encontrarPorId(siteTxId);
  }
  if (!pedido && paymentId) {
    pedido = await pedidosRepo.encontrarPorPwPaymentId(paymentId);
  }

  if (!pedido || pedido.estado !== 'PendienteDePago') return;

  if (status === 'approved') {
    await pedidosRepo.actualizarEstado(pedido.id, 'Confirmado', { pw_payment_id: paymentId || undefined });
    await facturacionService.emitirFactura(pedido).catch(err => console.error('[facturacion]', err));
  } else if (status === 'rejected' || status === 'cancelled') {
    const motivo = status === 'rejected' ? 'pago_rechazado' : 'solicitado_por_cliente';
    await pedidosRepo.actualizarEstado(pedido.id, 'Cancelado', { motivo_cancelacion: motivo });
    for (const detalle of pedido.detalles ?? []) {
      if (detalle.producto_id) {
        await productosRepo.restaurarStock(detalle.producto_id, detalle.cantidad);
      }
    }
  }
}
