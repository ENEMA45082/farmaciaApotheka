import { useState } from 'react';
import { cancelarPedidoAdmin } from '../../api/pedidos.api';
import type { Pedido } from '../../types';

const MOTIVOS_CANCELACION = [
  'sin_stock',
  'pago_no_recibido',
  'pago_rechazado',
  'solicitado_por_cliente',
  'error_direccion',
  'otro',
] as const;

const MOTIVO_LABEL: Record<string, string> = {
  sin_stock:               'Sin stock',
  pago_no_recibido:        'Pago no recibido',
  pago_rechazado:          'Pago rechazado',
  solicitado_por_cliente:  'Solicitado por el cliente',
  error_direccion:         'Error en la dirección',
  otro:                    'Otro',
};

interface Props {
  pedido: Pedido;
  onClose: () => void;
  onCancelado: (pedidoActualizado: Pedido) => void;
}

export function CancelarPedidoModal({ pedido, onClose, onCancelado }: Props) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmar() {
    if (!motivo) return;
    setEnviando(true);
    setError(null);
    try {
      const actualizado = await cancelarPedidoAdmin(pedido.id, motivo);
      onCancelado(actualizado);
    } catch {
      setError('No se pudo cancelar el pedido.');
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
          Cancelar pedido #APO-{String(pedido.nro_pedido).padStart(5, '0')}
        </h2>

        <div className="form-group">
          <label htmlFor="motivo-cancelacion">Motivo de la cancelación</label>
          <select
            id="motivo-cancelacion"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            disabled={enviando}
          >
            <option value="" disabled>Elegí un motivo…</option>
            {MOTIVOS_CANCELACION.map(m => (
              <option key={m} value={m}>{MOTIVO_LABEL[m]}</option>
            ))}
          </select>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <div className="modal-cancelar-pedido__acciones">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={enviando}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn--primary modal-cancelar-pedido__confirmar"
            onClick={handleConfirmar}
            disabled={!motivo || enviando}
          >
            {enviando ? 'Cancelando…' : 'Cancelar pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}
