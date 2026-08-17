import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMisPuntos, fetchCatalogoPremios, canjearPremio } from '../api/puntos.api';
import { PerfilLayout } from '../components/layout/PerfilLayout';
import { PremioGrid } from '../components/premios/PremioGrid';
import type { SaldoPuntos, Premio } from '../types';

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function PuntosPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [saldo, setSaldo] = useState<SaldoPuntos | null>(null);
  const [premios, setPremios] = useState<Premio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canjeandoId, setCanjeandoId] = useState<string | null>(null);
  const [mensajeCanje, setMensajeCanje] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  const cargar = useCallback(() => {
    if (!user) return;
    setCargando(true);
    setError(null);
    Promise.all([fetchMisPuntos(), fetchCatalogoPremios()])
      .then(([s, p]) => { setSaldo(s); setPremios(p); })
      .catch(() => setError('No se pudo cargar tu información de puntos.'))
      .finally(() => setCargando(false));
  }, [user]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleCanjear(premio: Premio) {
    setCanjeandoId(premio.id);
    setMensajeCanje(null);
    try {
      await canjearPremio(premio.id);
      setMensajeCanje(`¡Canjeaste "${premio.nombre}"! Te vamos a contactar para coordinar la entrega.`);
      cargar();
    } catch {
      setMensajeCanje('No se pudo completar el canje. Intentá de nuevo.');
    } finally {
      setCanjeandoId(null);
    }
  }

  if (!authLoading && !user) return null;
  if (authLoading || cargando) {
    return <PerfilLayout><div className="perfil-loading">Cargando tus puntos...</div></PerfilLayout>;
  }

  return (
    <PerfilLayout>
      <h2 className="perfil-titulo">Mis Puntos</h2>

      <div className="puntos-saldo-card">
        <span className="puntos-saldo-card__label">Saldo disponible</span>
        <span className="puntos-saldo-card__valor">{saldo?.saldo ?? 0} pts</span>
      </div>

      {mensajeCanje && <p className="puntos-mensaje-canje">{mensajeCanje}</p>}

      <h3 className="perfil-subtitulo">Catálogo de premios</h3>
      <PremioGrid
        premios={premios}
        cargando={false}
        error={error}
        saldo={saldo?.saldo ?? 0}
        canjeandoId={canjeandoId}
        onCanjear={handleCanjear}
      />

      {saldo && saldo.movimientos.length > 0 && (
        <>
          <h3 className="perfil-subtitulo">Historial de movimientos</h3>
          <ul className="puntos-movimientos-lista">
            {saldo.movimientos.map(m => (
              <li key={m.id} className="puntos-movimiento-item">
                <span>{m.tipo === 'acreditacion' ? 'Puntos ganados' : 'Canje de premio'}</span>
                <span className="puntos-movimiento-item__fecha">{formatFecha(m.creado_en)}</span>
                <span className={m.puntos >= 0 ? 'puntos-movimiento-item__positivo' : 'puntos-movimiento-item__negativo'}>
                  {m.puntos >= 0 ? '+' : ''}{m.puntos}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </PerfilLayout>
  );
}
