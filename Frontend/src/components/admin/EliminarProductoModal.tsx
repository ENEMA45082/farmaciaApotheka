import { useState } from 'react';
import { eliminarProducto } from '../../api/productos.api';
import type { Producto } from '../../types';

interface Props {
  producto: Producto;
  onClose: () => void;
  onEliminado: (productoId: string) => void;
}

export function EliminarProductoModal({ producto, onClose, onEliminado }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmar() {
    setEnviando(true);
    setError(null);
    try {
      await eliminarProducto(producto.id);
      onEliminado(producto.id);
    } catch {
      setError('No se pudo eliminar el producto.');
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
          Eliminar "{producto.nombre}"
        </h2>

        {producto.stock > 0 && (
          <div className="admin-error">
            ⚠ Este producto tiene {producto.stock} unidad{producto.stock === 1 ? '' : 'es'} en stock — se van a perder junto con el producto.
          </div>
        )}

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
            {enviando ? 'Eliminando…' : 'Eliminar producto'}
          </button>
        </div>
      </div>
    </div>
  );
}
