import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

app.get('/health', (_req, res) => res.json({ estado: 'ok' }));

app.use('/api/productos',    productosRoutes);
app.use('/api/categorias',  categoriasRoutes);
app.use('/api/uploads',     uploadsRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/perfil',      perfilRoutes);
app.use('/api/pedidos',     pedidosRoutes);
app.use('/api/direcciones', direccionesRoutes);
app.use('/api/favoritos',   favoritosRoutes);
app.use('/api/envio',       envioRoutes);
app.use('/api/pagos',       pagosRoutes);

app.use(errorHandler);

export default app;
