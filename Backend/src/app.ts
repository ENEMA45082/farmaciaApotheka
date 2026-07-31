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
import uploadsRoutes       from './routes/uploads.routes';
import estadisticasRoutes  from './routes/estadisticas.routes';
import perfilRoutes        from './routes/perfil.routes';
import pedidosRoutes       from './routes/pedidos.routes';
import direccionesRoutes   from './routes/direcciones.routes';
import favoritosRoutes     from './routes/favoritos.routes';
import envioRoutes         from './routes/envio.routes';
import pagosRoutes         from './routes/pagos.routes';
import facturasRoutes      from './routes/facturas.routes';
import testAfipRoutes      from './routes/testAfip.routes'; // TEMPORAL: ver TEST_AFIP.md, eliminar antes de producción
import testAfipProduccionRoutes from './routes/testAfipProduccion.routes'; // TEMPORAL: ver TEST_AFIP_PRODUCCION.md — pega contra ARCA PRODUCCIÓN real
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
app.use(limitadorGeneral);

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
app.use('/api/uploads',     uploadsRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/perfil',      perfilRoutes);
app.use('/api/pedidos',     limitadorPedidos, pedidosRoutes);
app.use('/api/direcciones', direccionesRoutes);
app.use('/api/favoritos',   favoritosRoutes);
app.use('/api/envio',       envioRoutes);
// limitadorPagos/limitadorPagosCallback se aplican por ruta adentro de pagos.routes.ts
// (distintos endpoints necesitan distinto presupuesto — ver ese archivo).
app.use('/api/pagos',       pagosRoutes);
app.use('/api/facturas',    facturasRoutes);
app.use('/api/test-afip',   testAfipRoutes); // TEMPORAL: eliminar antes de producción
app.use('/api/test-afip-produccion', testAfipProduccionRoutes); // TEMPORAL: pega contra ARCA PRODUCCIÓN real, ver TEST_AFIP_PRODUCCION.md

app.use(manejadorErrores);

export default app;
