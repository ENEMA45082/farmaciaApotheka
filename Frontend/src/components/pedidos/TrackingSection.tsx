import { useEffect, useState } from 'react';
import { fetchTracking } from '../../api/pedidos.api';
import type { ResultadoTracking } from '../../types';

interface Props {
  pedidoId: string;
}

function formatFechaEvento(fecha: string) {
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? fecha : d.toLocaleString('es-AR');
}

export function TrackingSection({ pedidoId }: Props) {
  const [tracking, setTracking] = useState<ResultadoTracking | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTracking(pedidoId)
      .then(setTracking)
      .catch(() => setError('No se pudo obtener el seguimiento del envío.'))
      .finally(() => setCargando(false));
  }, [pedidoId]);

  return (
    <div className="pedido-tracking">
      <h2 className="pedido-tracking__titulo">Seguimiento del envío</h2>

      {cargando && <p className="pedido-tracking__estado">Cargando seguimiento...</p>}
      {error && <p className="pedido-tracking__estado pedido-tracking__estado--error">{error}</p>}

      {tracking && !cargando && !error && (
        tracking.events.length === 0 ? (
          <p className="pedido-tracking__estado">Aún no hay novedades de tu envío.</p>
        ) : (
          <ul className="pedido-tracking__lista">
            {tracking.events.map((ev, i) => (
              <li key={i} className="pedido-tracking__evento">
                <span className="pedido-tracking__evento-fecha">{formatFechaEvento(ev.date)}</span>
                <span className="pedido-tracking__evento-desc">
                  {ev.event}{ev.branch ? ` — ${ev.branch}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
