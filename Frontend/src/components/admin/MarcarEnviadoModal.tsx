import { useState } from 'react';
import { cambiarEstadoPedido } from '../../api/pedidos.api';
import type { Pedido } from '../../types';

interface Props {
  pedido: Pedido;
  onClose: () => void;
  onEnviado: (pedidoActualizado: Pedido) => void;
}

export function MarcarEnviadoModal({ pedido, onClose, onEnviado }: Props) {
  const [tracking, setTracking] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmar() {
    const codigo = tracking.trim();
    if (!codigo) return;
    setEnviando(true);
    setError(null);
    try {
      const actualizado = await cambiarEstadoPedido(pedido.id, 'Enviado', codigo);
      onEnviado(actualizado);
    } catch {
      setError('No se pudo marcar el pedido como enviado.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-cancelar-pedido" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className="modal-cancelar-pedido__cerrar"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <h2 className="modal-cancelar-pedido__titulo">
          Marcar como enviado — Pedido #APO-{String(pedido.nro_pedido).padStart(5, '0')}
        </h2>

        <div className="form-group">
          <label htmlFor="tracking-envio">Código de seguimiento (Correo Argentino)</label>
          <input
            id="tracking-envio"
            type="text"
            value={tracking}
            onChange={e => setTracking(e.target.value)}
            disabled={enviando}
            maxLength={100}
            placeholder="Ej: CA123456789AR"
          />
        </div>

        {error && <div className="admin-error">{error}</div>}

        <div className="modal-cancelar-pedido__acciones">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={enviando}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleConfirmar}
            disabled={!tracking.trim() || enviando}
          >
            {enviando ? 'Guardando…' : 'Marcar como enviado'}
          </button>
        </div>
      </div>
    </div>
  );
}
