import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { supabase } from './config/supabase';
import { limitadorGeneral, limitadorPedidos } from './middlewares/limitadorSolicitudes';
import * as estadosRepo from './repositories/estados.repository';
import productosRoutes     from './routes/productos.routes';
import categoriasRoutes    from './routes/categorias.routes';
import estadosRoutes       from './routes/estados.routes';
import bannersRoutes       from './routes/banners.routes';
import bannersPromoRoutes  from './routes/bannersPromo.routes';
import productosDestacadosRoutes from './routes/productosDestacados.routes';
import uploadsRoutes       from './routes/uploads.routes';
import estadisticasRoutes  from './routes/estadisticas.routes';
import perfilRoutes        from './routes/perfil.routes';
import pedidosRoutes       from './routes/pedidos.routes';
import cuponesRoutes       from './routes/cupones.routes';
import puntosRoutes        from './routes/puntos.routes';
import direccionesRoutes   from './routes/direcciones.routes';
import favoritosRoutes     from './routes/favoritos.routes';
import envioRoutes         from './routes/envio.routes';
import pagosRoutes         from './routes/pagos.routes';
import facturasRoutes      from './routes/facturas.routes';
import testAfipRoutes      from './routes/testAfip.routes'; // TEMPORAL: ver TEST_AFIP.md, eliminar antes de producción
import testAfipProduccionRoutes from './routes/testAfipProduccion.routes'; // TEMPORAL: ver TEST_AFIP_PRODUCCION.md — pega contra ARCA PRODUCCIÓN real
import webhooksRoutes      from './routes/webhooks.routes';
import { manejadorErrores } from './middlewares/manejadorErrores';

dotenv.config();

const app = express();

// Vercel corre el backend detrás de su proxy y agrega X-Forwarded-For/Proto —
// sin esto, express-rate-limit no puede identificar la IP real del cliente.
app.set('trust proxy', 1);

const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

app.use(helmet());
app.use(morgan('combined'));

// cors() va antes que el limitador: así el preflight OPTIONS lo responde
// cors() directo (204) sin pasar por limitadorGeneral. Si quedara después,
// cada preflight consume cupo del limitador general igual que una request
// real — y si el cupo ya se agotó, el propio preflight vuelve 429, el
// browser nunca intenta la request real, y se rompe TODO /api/*, no
// solo el endpoint que la disparó.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origenesPermitidos.some(o => origin === o)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin no permitido: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(limitadorGeneral);
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    if (error) throw error;
    res.json({ estado: 'ok', db: 'conectada' });
  } catch {
    res.status(503).json({ estado: 'error', db: 'sin conexión' });
  }
});

// Precarga el catálogo de estados en memoria antes de las rutas de API. En
// Vercel no hay un "boot" único (serverless): esto corre en el primer
// request de cada cold start y es un no-op rápido en los siguientes
// (memoizado dentro de estados.repository.ts). Va después de /health para
// que el health check no dependa de esta tabla.
app.use('/api', async (_req, res, next) => {
  try {
    await estadosRepo.precargarCache();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/productos',    productosRoutes);
app.use('/api/categorias',  categoriasRoutes);
app.use('/api/estados',     estadosRoutes);
app.use('/api/banners',     bannersRoutes);
app.use('/api/banners-promo', bannersPromoRoutes);
app.use('/api/productos-destacados', productosDestacadosRoutes);
app.use('/api/uploads',     uploadsRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/perfil',      perfilRoutes);
app.use('/api/pedidos',     limitadorPedidos, pedidosRoutes);
app.use('/api/cupones',     cuponesRoutes);
app.use('/api/puntos',      puntosRoutes);
app.use('/api/direcciones', direccionesRoutes);
app.use('/api/favoritos',   favoritosRoutes);
app.use('/api/envio',       envioRoutes);
// limitadorPagos/limitadorPagosCallback se aplican por ruta adentro de pagos.routes.ts
// (distintos endpoints necesitan distinto presupuesto — ver ese archivo).
app.use('/api/pagos',       pagosRoutes);
app.use('/api/facturas',    facturasRoutes);
// TEMPORAL: eliminar antes de producción (ver TEST_AFIP.md / TEST_AFIP_PRODUCCION.md).
// Ya están detrás de requiereAdmin + fricción extra (?confirmo=produccion, body
// confirmoEmisionReal), pero igual no deberían quedar montados en un deploy de
// producción sin querer — HABILITAR_TEST_AFIP=true es la vía de escape explícita
// para el caso puntual (ver comentario en testAfipProduccion.routes.ts) de necesitar
// pegarle a ARCA producción real desde un deploy productivo.
if (process.env.NODE_ENV !== 'production' || process.env.HABILITAR_TEST_AFIP === 'true') {
  app.use('/api/test-afip',   testAfipRoutes);
  app.use('/api/test-afip-produccion', testAfipProduccionRoutes);
}
app.use('/api/webhooks',    webhooksRoutes);

app.use(manejadorErrores);

export default app;
