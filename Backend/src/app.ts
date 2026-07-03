import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { supabase } from './config/supabase';
import { swaggerSpec } from './config/swagger';
import { generalLimiter, pagosLimiter, pedidosLimiter } from './middlewares/rateLimiter';
import productosRoutes     from './routes/productos.routes';
import categoriasRoutes    from './routes/categorias.routes';
import uploadsRoutes       from './routes/uploads.routes';
import estadisticasRoutes  from './routes/estadisticas.routes';
import perfilRoutes        from './routes/perfil.routes';
import pedidosRoutes       from './routes/pedidos.routes';
import direccionesRoutes   from './routes/direcciones.routes';
import favoritosRoutes     from './routes/favoritos.routes';
import envioRoutes         from './routes/envio.routes';
import pagosRoutes         from './routes/pagos.routes';
import { errorHandler }    from './middlewares/errorHandler';

dotenv.config();

const app = express();

const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

app.use(helmet());
app.use(morgan('combined'));
app.use(generalLimiter);

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
    const { error } = await supabase.from('productos').select('id').limit(1);
    if (error) throw error;
    res.json({ estado: 'ok', db: 'conectada' });
  } catch {
    res.status(503).json({ estado: 'error', db: 'sin conexión' });
  }
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/productos',    productosRoutes);
app.use('/api/categorias',  categoriasRoutes);
app.use('/api/uploads',     uploadsRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/perfil',      perfilRoutes);
app.use('/api/pedidos',     pedidosLimiter, pedidosRoutes);
app.use('/api/direcciones', direccionesRoutes);
app.use('/api/favoritos',   favoritosRoutes);
app.use('/api/envio',       envioRoutes);
app.use('/api/pagos',       pagosLimiter, pagosRoutes);

app.use(errorHandler);

export default app;
