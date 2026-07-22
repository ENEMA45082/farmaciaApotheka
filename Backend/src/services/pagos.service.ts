// eslint-disable-next-line @typescript-eslint/no-require-imports
const sdkPayway = require('sdk-node-payway') as {
  sdk: new (
    environment: string,
    publicKey: string,
    privateKey: string,
    grouper: string,
    developer: string,
  ) => {
    payment:        (args: Record<string, unknown>, cb: (result: any, err: any) => void) => void;
    checkout:       (args: Record<string, unknown>, cb: (result: any, err: any) => void) => void;
    paymentInfo:    (paymentId: string, cb: (result: any, err: any) => void) => void;
    getAllPayments: (
      offset: string | undefined,
      pageSize: string | undefined,
      siteOperationId: string | undefined,
      merchantId: string | undefined,
      cb: (result: any, err: any) => void,
    ) => void;
  };
};

import axios from 'axios';
import * as pedidosRepo   from '../repositories/pedidos.repository';
import * as productosRepo from '../repositories/productos.repository';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import type { Pedido, FraudData } from '../types';

// Payway rechaza URLs de localhost — usar la URL pública del frontend cuando se corre localmente.
export function obtenerFrontendBaseUrl(): string {
  const frontUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const publicFrontUrl = process.env.FRONTEND_PUBLIC_URL ?? frontUrl;
  const esLocal = frontUrl.includes('localhost') || frontUrl.includes('127.0.0.1');
  return esLocal ? publicFrontUrl : frontUrl;
}

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

export async function aplicarResultadoPago(
  pedido: Pedido,
  status: string,
  paymentId: string,
  siteTransactionId?: string,
): Promise<void> {
  if (status === 'approved') {
    // La factura ya no se dispara acá: se emite recién cuando el pedido pasa a
    // "Entregado" (ver pedidos.service.ts::cambiarEstado), sin importar el
    // método de pago.
    await pedidosRepo.actualizarEstado(pedido.id, 'Confirmado', {
      pw_payment_id: paymentId || undefined,
      pw_site_transaction_id: siteTransactionId || undefined,
    });
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
        if (!result || result.error_type) {
          console.error('[Payway pagar] Error de Payway al procesar el pago:', JSON.stringify(result ?? err));
          return reject(new AppError(
            'No pudimos procesar el pago con tarjeta en este momento. Probá de nuevo en unos minutos o con otro medio de pago.',
            502,
          ));
        }
        resolve({ status: String(result.status), pw_payment_id: String(result.id) });
      },
    );
  });

  if (pedido.estado === 'PendienteDePago') {
    await aplicarResultadoPago(pedido, pagoResult.status, pagoResult.pw_payment_id);
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
  const backUrl  = process.env.BACKEND_URL  ?? 'http://localhost:3001';

  const baseUrl        = obtenerFrontendBaseUrl();
  const cancelUrl      = `${baseUrl}/pago/cancelado?pedido=${pedido.id}`;
  // Payway requiere notifications_url — cuando el backend corre en localhost usar la URL pública desplegada.
  // Sin query string propia (Payway rechazaba ?secret=<hex largo> con param_required).
  const publicBackUrl = process.env.BACKEND_PUBLIC_URL ?? backUrl;
  const notifUrl = `${publicBackUrl}/api/pagos/notificacion`;
  // redirect_url (no success_url): Payway vuelve acá con ?result=<base64 con el pago
  // real> — se recibe en el backend (no directo al frontend) para poder verificarlo
  // contra la API de Payway antes de confirmar el pedido (ver confirmarRetornoCheckout).
  // Va como path param, sin query string propia, para no chocar con el ?result= que
  // Payway pega sin fijarse si la URL ya tenía query string.
  const retornoUrl = `${publicBackUrl}/api/pagos/retorno-checkout/${pedido.id}`;

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
    site_transaction_id: pedido.id, // Payway NO lo respeta en el checkout hosteado — genera su propio id (ver verificarEstadoPago)
    products:            productosPayway,
    total_price:      pedido.total,
    site:             siteId,
    redirect_url:     retornoUrl,
    cancel_url:       cancelUrl,
    notifications_url: notifUrl,
    template_id:      templateId,
    installments:     [1],
    plan_gobierno:    false,
    public_apikey:    process.env.PAYWAY_PUBLIC_KEY ?? '',
    auth_3ds:         false,
  };

  // Llamada HTTP directa (no vía sdk-node-payway) para este endpoint puntual: el SDK
  // descarta el status code y los headers de la respuesta de Payway y solo deja ver
  // el body ya parseado — con esto se ve exactamente qué se manda y qué contesta
  // Payway, útil para diagnosticar cualquier rechazo futuro de la creación del checkout.
  const checkoutApiBase = env === 'production'
    ? 'https://ventasonline.payway.com.ar/api/v1/checkout-payment-button'
    : 'https://developers.decidir.com/api/v1/checkout-payment-button';
  const checkoutEndpoint = `${checkoutApiBase}/link`;
  const xSourceHeader = Buffer.from(JSON.stringify({
    service:   'SDK-NODE',
    grouper:   process.env.PAYWAY_MERCHANT_ID ?? 'Farmacia Apotheka',
    developer: process.env.PAYWAY_DEVELOPER   ?? 'apotheka-dev',
  })).toString('base64');

  console.log(`[Payway checkout] templateId=${templateId} siteId=${siteId} env=${env}`);
  console.log(`[Payway checkout] notifications_url="${notifUrl}"`);
  console.log(`[Payway checkout] redirect_url="${retornoUrl}"`);
  console.log('[Payway checkout] POST', checkoutEndpoint);
  console.log('[Payway checkout] args:', JSON.stringify(args));

  const respuesta = await axios.post(checkoutEndpoint, args, {
    headers: {
      apikey:         process.env.PAYWAY_PRIVATE_KEY ?? '',
      'Content-Type': 'application/json',
      'X-Source':     xSourceHeader,
    },
    // Queremos ver la respuesta completa de Payway incluso cuando es un error —
    // por default axios tira una excepción en 4xx/5xx y hay que ir a buscar el
    // detalle dentro de err.response; así lo tenemos directo.
    validateStatus: () => true,
  });

  console.log('[Payway checkout] HTTP status:', respuesta.status);
  console.log('[Payway checkout] response headers:', JSON.stringify(respuesta.headers));
  console.log('[Payway checkout] response body:', JSON.stringify(respuesta.data));

  const result = respuesta.data;

  if (respuesta.status >= 400 || !result || result.error_type) {
    console.error('[Payway checkout] Error de Payway al crear el checkout:', respuesta.status, JSON.stringify(result));
    throw new AppError(
      'No pudimos iniciar el pago con tarjeta en este momento. Probá de nuevo en unos minutos o con otro medio de pago.',
      502,
    );
  }

  let paymentId = result?.payment_id ?? result?.id;
  const webCheckoutBaseUrl = env === 'production'
    ? 'https://live.decidir.com/web/checkout/'
    : 'https://developers.decidir.com/web/checkout/';
  const checkoutUrl = result?.checkout_url
    ?? result?.payment_link
    ?? (paymentId ? `${webCheckoutBaseUrl}${paymentId}` : null);

  if (!checkoutUrl) {
    console.error('[Payway checkout] Respuesta sin URL de checkout:', JSON.stringify(result));
    throw new AppError(
      'No pudimos iniciar el pago con tarjeta en este momento. Probá de nuevo en unos minutos o con otro medio de pago.',
      502,
    );
  }

  // La respuesta del link de checkout a veces no trae payment_id/id explícito
  // (solo payment_link) — el último segmento del link ES el identificador del pago.
  if (!paymentId) {
    const match = String(checkoutUrl).match(/\/checkout\/([^/?#]+)/);
    if (match) paymentId = match[1];
  }

  // Guardar el payment_id para poder identificar el pedido cuando llegue la notificación
  // (o para poder verificarlo activamente al volver a /pago/exitoso) — se espera antes
  // de devolver la URL para que quede grabado antes de que el usuario vuelva de Payway.
  if (paymentId) {
    try {
      await pedidosRepo.guardarPwPaymentId(pedido.id, String(paymentId));
    } catch (err) {
      console.error('[Payway checkout] Error guardando pw_payment_id:', err);
    }
  }

  return checkoutUrl;
}

export async function procesarNotificacion(body: Record<string, unknown>): Promise<void> {
  const paymentId  = String(body.id ?? body.payment_id ?? '');
  const siteTxId   = String(body.site_transaction_id ?? '');

  if (!paymentId && !siteTxId) {
    console.log(`[Payway Notificacion] ignorada: faltan paymentId/siteTransactionId (body=${JSON.stringify(body)})`);
    return;
  }

  // Intentar encontrar el pedido por site_transaction_id (= pedido.id) primero,
  // con fallback a pw_payment_id para pagos directos con token
  let pedido = null;
  if (siteTxId) {
    pedido = await pedidosRepo.encontrarPorId(siteTxId);
  }
  if (!pedido && paymentId) {
    pedido = await pedidosRepo.encontrarPorPwPaymentId(paymentId);
  }

  if (!pedido) {
    console.log(`[Payway Notificacion] ignorada: no se encontró pedido (siteTxId=${siteTxId} paymentId=${paymentId})`);
    return;
  }

  // El body de esta notificación NUNCA se usa como fuente del estado del pago —
  // Payway lo manda server-to-server pero cualquiera puede simular el mismo POST
  // (no está firmado, y el chequeo de PAYWAY_WEBHOOK_SECRET es defensa secundaria,
  // no la única barrera). El webhook solo dispara una verificación activa contra
  // la API de Payway (misma lógica que GET /api/pagos/verificar/:pedidoId) — el
  // pedido únicamente se confirma si Payway confirma el pago de su lado.
  console.log(`[Payway Notificacion] pedido ${pedido.id} encontrado — verificando estado real contra Payway antes de aplicar ningún cambio`);
  await verificarEstadoPago(pedido);
}

function esperar(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function consultarPagosPayway(siteOperationId: string | undefined): Promise<any[]> {
  return new Promise((resolve, reject) => {
    paywaySDK.getAllPayments(undefined, '20', siteOperationId, undefined, (result: any, err: any) => {
      const etiqueta = siteOperationId ? `siteOperationId=${siteOperationId}` : 'sin filtro';
      console.log(`[Payway verificarEstado] getAllPayments(${etiqueta}) result:`, JSON.stringify(result));
      console.log(`[Payway verificarEstado] getAllPayments(${etiqueta}) err:`, JSON.stringify(err));
      if (!result && err) return reject(new Error(JSON.stringify(err)));

      const lista: any[] = Array.isArray(result)          ? result
        : Array.isArray(result?.payments)                 ? result.payments
        : Array.isArray(result?.results)                  ? result.results
        : Array.isArray(result?.data)                      ? result.data
        : [];
      resolve(lista);
    });
  });
}

const REINTENTOS_VERIFICACION = 3;
const ESPERA_ENTRE_REINTENTOS_MS = 2000;

// Consulta activa a Payway: se usa cuando el usuario cae en /pago/exitoso, en vez
// de depender exclusivamente de que Payway llegue a mandar el webhook (poco confiable
// en la práctica — ver notificaciones que nunca llegan pese a notifications_url correcta).
//
// El id de pago que devuelve el link de checkout NO sirve para paymentInfo (probado:
// devuelve not_found_error — es un hash del formulario, no un id de /payments). En vez
// de depender de ese id, se busca el pago por site_transaction_id (= pedido.id), que es
// el identificador que nosotros mismos le mandamos a Payway al crear el checkout.
export async function verificarEstadoPago(pedido: Pedido): Promise<Pedido> {
  if (pedido.estado !== 'PendienteDePago') {
    return pedido;
  }

  let pago: any = null;
  for (let intento = 1; intento <= REINTENTOS_VERIFICACION && !pago; intento++) {
    const lista = await consultarPagosPayway(pedido.id);
    pago = lista.find(p => String(p?.site_transaction_id) === pedido.id) ?? null;
    if (!pago && intento < REINTENTOS_VERIFICACION) {
      await esperar(ESPERA_ENTRE_REINTENTOS_MS);
    }
  }

  if (!pago) {
    // Diagnóstico: consulta sin filtro para ver si el pago aparece bajo otro
    // site_transaction_id (o no aparece en absoluto) — ayuda a distinguir lag de
    // indexación vs. flujo que no preserva site_transaction_id vs. pago no acreditado.
    const listaSinFiltro = await consultarPagosPayway(undefined).catch(err => {
      console.error('[Payway verificarEstado] error en consulta sin filtro:', err);
      return [] as any[];
    });
    console.log(
      `[Payway verificarEstado] no se encontró el pago tras ${REINTENTOS_VERIFICACION} intentos — diagnóstico sin filtro (${listaSinFiltro.length} resultado(s)):`,
      JSON.stringify(listaSinFiltro),
    );
    return pedido;
  }

  const status    = String(pago.status ?? '');
  const paymentId = String(pago.id ?? '');
  if (!status) {
    throw new AppError('No se pudo obtener el estado del pago desde Payway', 502);
  }

  await aplicarResultadoPago(pedido, status, paymentId, String(pago.site_transaction_id ?? ''));

  const actualizado = await pedidosRepo.encontrarPorId(pedido.id);
  return actualizado ?? pedido;
}

// Se llama desde el retorno del checkout hosteado (redirect_url) cuando el cliente
// vuelve de pagar. Payway le agrega a esa URL un ?result=<base64> con el pago
// completo — pero esa URL la arma el NAVEGADOR DEL CLIENTE, así que `resultHint`
// nunca es fuente de verdad. Se usa únicamente su `site_transaction_id` (el que
// Payway le asignó de verdad al pago, no el nuestro) como pista de qué transacción
// buscar; la confirmación depende solo de lo que Payway responda acá.
export async function confirmarRetornoCheckout(pedidoId: string, resultHint: unknown): Promise<void> {
  validarUUID(pedidoId, 'pedido');
  const pedido = await pedidosRepo.encontrarPorId(pedidoId);
  if (!pedido) {
    console.log(`[Payway retorno] ignorado: pedido ${pedidoId} no encontrado`);
    return;
  }
  if (pedido.estado !== 'PendienteDePago') {
    console.log(`[Payway retorno] ignorado: pedido ${pedido.id} ya está en estado "${pedido.estado}"`);
    return;
  }

  const siteTxIdReal = String((resultHint as Record<string, unknown> | null)?.site_transaction_id ?? '');
  if (!siteTxIdReal) {
    console.error(`[Payway retorno] pedido ${pedido.id}: no se pudo extraer site_transaction_id del resultado de Payway`);
    return;
  }

  const lista = await consultarPagosPayway(siteTxIdReal);
  const pago = lista.find(p => String(p?.site_transaction_id) === siteTxIdReal) ?? null;

  if (!pago) {
    console.error(`[Payway retorno] pedido ${pedido.id}: no se encontró en Payway ningún pago con site_transaction_id=${siteTxIdReal}`);
    return;
  }

  const montoEsperado  = Math.round(pedido.total * 100);
  const siteIdEsperado = process.env.PAYWAY_SITE_ID ?? '';
  if (Number(pago.amount) !== montoEsperado || String(pago.site_id) !== siteIdEsperado) {
    console.error(
      `[Payway retorno] pedido ${pedido.id}: el pago encontrado no coincide ` +
      `(monto esperado=${montoEsperado} recibido=${pago.amount}, site esperado=${siteIdEsperado} recibido=${pago.site_id}) — no se confirma`,
    );
    return;
  }

  const paymentIdReal = String(pago.id ?? '');

  // Guarda anti-replay: si este pago de Payway ya está linkeado a OTRO pedido,
  // alguien está reusando una URL de retorno ya consumida contra un pedido distinto.
  const pedidoExistente = await pedidosRepo.encontrarPorPwPaymentId(paymentIdReal);
  if (pedidoExistente && pedidoExistente.id !== pedido.id) {
    console.error(
      `[Payway retorno] ALERTA posible replay: el pago ${paymentIdReal} ya está asociado al pedido ${pedidoExistente.id} — ` +
      `se intentó reusar contra el pedido ${pedido.id}. No se confirma.`,
    );
    return;
  }

  await aplicarResultadoPago(pedido, String(pago.status ?? ''), paymentIdReal, siteTxIdReal);
}
