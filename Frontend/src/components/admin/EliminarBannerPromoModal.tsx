import { useState } from 'react';
import { eliminarBannerPromo } from '../../api/bannersPromo.api';
import type { BannerPromo } from '../../types';

interface Props {
  banner: BannerPromo;
  onClose: () => void;
  onEliminado: (bannerId: string) => void;
}

export function EliminarBannerPromoModal({ banner, onClose, onEliminado }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmar() {
    setEnviando(true);
    setError(null);
    try {
      await eliminarBannerPromo(banner.id);
      onEliminado(banner.id);
    } catch {
      setError('No se pudo eliminar el banner.');
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
          Eliminar banner "{banner.titulo}"
        </h2>

        <p>Esta acción no se puede deshacer.</p>

        {error && <div className="admin-error">{error}</div>}

        <div className="modal-cancelar-pedido__acciones">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary modal-cancelar-pedido__confirmar"
            onClick={handleConfirmar}
            disabled={enviando}
          >
            {enviando ? 'Eliminando…' : 'Eliminar banner'}
          </button>
        </div>
      </div>
    </div>
  );
}
