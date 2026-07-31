import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

// Lee el "sub" (id de usuario) del JWT sin verificarlo — acá solo interesa como
// clave de conteo del limitador de solicitudes, no como prueba de identidad: si
// alguien manda un token forjado con un "sub" inventado, en el peor caso se gana
// su propio balde de límite, requiereAutenticacion lo va a rechazar igual más
// adelante en la cadena. Evita depender del orden de middlewares (funciona esté
// o no requiereAutenticacion ya ejecutado).
function extraerIdUsuarioSinVerificar(req: Request): string | undefined {
  const encabezado = req.headers.authorization;
  if (!encabezado?.startsWith('Bearer ')) return undefined;
  const contenidoBase64 = encabezado.slice(7).split('.')[1];
  if (!contenidoBase64) return undefined;
  try {
    const contenido = JSON.parse(Buffer.from(contenidoBase64, 'base64url').toString('utf8')) as { sub?: unknown };
    return typeof contenido.sub === 'string' ? contenido.sub : undefined;
  } catch {
    return undefined;
  }
}

// Por usuario cuando hay token (para que cambiar de IP no esquive el límite en
// endpoints autenticados), con reserva a IP para solicitudes sin token.
function generarClavePorUsuarioOIP(req: Request): string {
  const idUsuario = extraerIdUsuarioSinVerificar(req);
  return idUsuario ? `usuario:${idUsuario}` : ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'desconocida');
}

export const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.', statusCode: 429 },
});

// Límite estricto para intentos de cobro con tarjeta — solo /pagar y /checkout,
// las acciones que el usuario dispara a voluntad para procesar un pago.
export const limitadorPagos = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generarClavePorUsuarioOIP,
  message: { error: 'Límite de solicitudes de pago alcanzado. Esperá 15 minutos.', statusCode: 429 },
});

// Límite más laxo para lo que no dispara el usuario a voluntad: el retorno
// automático del checkout hosteado de Payway, el webhook de notificación
// (lo llama el servidor de Payway, no el cliente), y la verificación activa
// de estado. Compartir el balde estricto de limitadorPagos con estos hacía que
// un cliente reintentando un pago rechazado se quedara sin cupo para pagar.
export const limitadorPagosCallback = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generarClavePorUsuarioOIP,
  message: { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.', statusCode: 429 },
});

// Límite moderado para creación y gestión de pedidos
export const limitadorPedidos = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generarClavePorUsuarioOIP,
  message: { error: 'Demasiadas solicitudes de pedidos. Intentá en unos minutos.', statusCode: 429 },
});
