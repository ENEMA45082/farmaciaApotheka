import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.', statusCode: 429 },
});

// Límite estricto para el procesamiento de pagos con tarjeta
export const pagosLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de solicitudes de pago alcanzado. Esperá 15 minutos.', statusCode: 429 },
});

// Límite moderado para creación y gestión de pedidos
export const pedidosLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de pedidos. Intentá en unos minutos.', statusCode: 429 },
});
