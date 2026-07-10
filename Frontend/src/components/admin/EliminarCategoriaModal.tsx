import { useState } from 'react';
import axios from 'axios';
import { eliminarCategoria } from '../../api/productos.api';
import type { Categoria } from '../../types';

interface Props {
  categoria: Categoria;
  onClose: () => void;
  onEliminada: (categoriaId: string) => void;
}

export function EliminarCategoriaModal({ categoria, onClose, onEliminada }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bloqueada, setBloqueada] = useState<string | null>(null);

  async function handleConfirmar() {
    setEnviando(true);
    setError(null);
    try {
      await eliminarCategoria(categoria.id);
      onEliminada(categoria.id);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setBloqueada(err.response.data?.error ?? 'No se puede eliminar: la categoría tiene productos asociados.');
      } else {
        setError('No se pudo eliminar la categoría.');
      }
    } finally {
      setEnviando(false);
    }
  }

  if (bloqueada) {
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
            No se puede eliminar "{categoria.nombre}"
          </h2>

          <p>{bloqueada}</p>

          <div className="modal-cancelar-pedido__acciones">
            <button type="button" className="btn btn--primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
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
          Eliminar categoría "{categoria.nombre}"
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
            {enviando ? 'Eliminando…' : 'Eliminar categoría'}
          </button>
        </div>
      </div>
    </div>
  );
}
