import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { fetchMisPedidos } from '../api/pedidos.api';
import { PerfilLayout } from '../components/layout/PerfilLayout';
import type { Pedido } from '../types';
import { formatPrecio } from '../types';
import { staggerContainer, staggerItem } from '../components/ui/motion';

const ESTADO_CONFIG: Record<Pedido['estado'], { label: string; clase: string }> = {
  PendienteDePago:  { label: 'Pendiente de pago', clase: 'badge--pendiente' },
  Confirmado:       { label: 'Confirmado',        clase: 'badge--confirmado' },
  EnPreparacion:    { label: 'En preparación',    clase: 'badge--preparacion' },
  Enviado:          { label: 'Enviado',           clase: 'badge--enviado' },
  ListoParaRetirar: { label: 'Listo para retirar', clase: 'badge--listo-retirar' },
  Entregado:        { label: 'Entregado',         clase: 'badge--entregado' },
  Cancelado:        { label: 'Cancelado',         clase: 'badge--cancelado' },
};

const MotionLink = motion(Link);

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function PedidosPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchMisPedidos()
      .then(setPedidos)
      .catch(() => setPedidos([]))
      .finally(() => setCargando(false));
  }, [user]);

  if (!authLoading && !user) return null;
  if (authLoading || cargando) return <PerfilLayout><div className="perfil-loading">Cargando pedidos...</div></PerfilLayout>;

  return (
    <PerfilLayout>
      <h2 className="perfil-titulo">Mis Pedidos</h2>

      {pedidos.length === 0 ? (
        <motion.div
          className="pedidos-vacio"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
        >
          <p>Todavía no realizaste ningún pedido.</p>
          <Link to="/" className="btn btn--primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Ver productos
          </Link>
        </motion.div>
      ) : (
        <motion.div
          className="pedidos-lista"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {pedidos.map(p => {
            const cfg = ESTADO_CONFIG[p.estado];
            return (
              <MotionLink
                key={p.id}
                to={`/pedidos/${p.id}`}
                className="pedido-card"
                variants={staggerItem}
                whileHover={{ y: -3 }}
              >
                <div className="pedido-card__left">
                  <span className="pedido-card__nro">Pedido #APO-{String(p.nro_pedido).padStart(5, '0')}</span>
                  <span className="pedido-card__fecha">{formatFecha(p.fecha_pedido)}</span>
                </div>
                <div className="pedido-card__right">
                  <span className={`estado-badge ${cfg.clase}`}>{cfg.label}</span>
                  <span className="pedido-card__total">${formatPrecio(p.total)}</span>
                </div>
              </MotionLink>
            );
          })}
        </motion.div>
      )}
    </PerfilLayout>
  );
}
