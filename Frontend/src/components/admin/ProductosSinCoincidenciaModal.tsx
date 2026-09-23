import { useMemo, useState } from 'react';
import { aplicarCambiosPrecio } from '../../api/productos.api';
import type { MotivoSinCoincidencia, ProductoSinCoincidencia } from '../../api/productos.api';
import { usePaginacionLocal } from '../../hooks/usePaginacionLocal';
import { mensajeDeErrorApi } from '../../utils/mensajeError';
import { formatPrecio } from '../../types';
import { PaginacionSimple } from './PaginacionSimple';

const POR_PAGINA = 50;

type FiltroMotivo = 'todos' | MotivoSinCoincidencia;

const ETIQUETA_MOTIVO: Record<MotivoSinCoincidencia, string> = {
  sin_codigo:        'Sin código de barras',
  no_esta_en_csv:    'No está en el CSV',
  duplicado_en_csv:  'Duplicado en el CSV',
};

interface Props {
  abierto: boolean;
  productos: ProductoSinCoincidencia[];
  onClose: () => void;
  onAplicados: (productoIds: string[]) => void;
}

// Acepta "1234,56" y "1234.56". null si está vacío o no es un precio > 0.
function parsearPrecioTipeado(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (!normalizado) return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero * 100) / 100 : null;
}

// Mismo criterio que RevisarCambiosPreciosModal: el estado (precios ya
// tipeados, buscador) vive mientras la página mantenga montado el modal.
export function ProductosSinCoincidenciaModal({ abierto, productos, onClose, onAplicados }: Props) {
  const [nuevosPrecios, setNuevosPrecios] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState('');
  const [motivo, setMotivo]     = useState<FiltroMotivo>('todos');
  const [aplicando, setAplicando] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [fallidos, setFallidos]   = useState<{ producto_id: string; razon: string }[]>([]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter(p => {
      if (motivo !== 'todos' && p.motivo !== motivo) return false;
      if (!q) return true;
      return p.nombre.toLowerCase().includes(q) || (p.codigo_barras ?? '').includes(q);
    });
  }, [productos, busqueda, motivo]);

  const { pagina, totalPaginas, visibles, irA } = usePaginacionLocal(filtrados, POR_PAGINA);

  // Con texto pero sin un precio válido (o un precio igual al actual, que no
  // cambia nada): solo los válidos y distintos se guardan.
  const modificados = productos.flatMap(p => {
    const precio = parsearPrecioTipeado(nuevosPrecios[p.producto_id] ?? '');
    return precio !== null && precio !== p.precio_actual ? [{ producto_id: p.producto_id, precio_nuevo: precio }] : [];
  });
  const invalidos = productos.filter(p => {
    const texto = (nuevosPrecios[p.producto_id] ?? '').trim();
    return texto !== '' && parsearPrecioTipeado(texto) === null;
  }).length;

  if (!abierto) return null;

  async function handleGuardar() {
    setAplicando(true);
    setError(null);
    setFallidos([]);

    const resultado = await aplicarCambiosPrecio(modificados);

    if (resultado.aplicados.length > 0) {
      onAplicados(resultado.aplicados);
      setNuevosPrecios(prev => {
        const siguiente = { ...prev };
        for (const id of resultado.aplicados) delete siguiente[id];
        return siguiente;
      });
    }
    setFallidos(resultado.fallidos);
    if (resultado.errorGeneral) {
      setError(mensajeDeErrorApi(
        resultado.errorGeneral,
        'No se pudieron guardar todos los precios. Revisá la lista e intentá de nuevo.',
      ));
    }
    setAplicando(false);

    if (!resultado.errorGeneral && resultado.fallidos.length === 0) onClose();
  }

  const nombreDe = (id: string) => productos.find(p => p.producto_id === id)?.nombre ?? id;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-precios" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className="modal-cancelar-pedido__cerrar"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <h2 className="modal-cancelar-pedido__titulo">No se encontraron estos códigos de barras en el CSV</h2>
        <p className="modal-precios__ayuda">
          Estos productos del sistema no tienen coincidencia en el archivo. Si querés, cargales el precio a mano:
          solo se guardan los que completes.
        </p>

        <div className="modal-precios__toolbar">
          <input
            type="search"
            className="precios-control"
            placeholder="Buscar por nombre o código…"
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); irA(1); }}
          />
          <select
            className="precios-control"
            value={motivo}
            onChange={e => { setMotivo(e.target.value as FiltroMotivo); irA(1); }}
            aria-label="Filtrar por motivo"
          >
            <option value="todos">Todos los motivos</option>
            {(Object.keys(ETIQUETA_MOTIVO) as MotivoSinCoincidencia[]).map(m => (
              <option key={m} value={m}>{ETIQUETA_MOTIVO[m]}</option>
            ))}
          </select>
        </div>

        {error && <div className="admin-error">{error}</div>}
        {fallidos.length > 0 && (
          <div className="admin-error">
            <strong>{fallidos.length} producto(s) no se pudieron actualizar:</strong>
            <ul className="modal-precios__lista-errores">
              {fallidos.map(f => (
                <li key={f.producto_id}>{nombreDe(f.producto_id)}: {f.razon}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="modal-precios__tabla">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código de barras</th>
                <th>Producto</th>
                <th>Precio actual</th>
                <th>Nuevo precio</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={4} className="modal-precios__vacio">
                    {productos.length === 0
                      ? 'No quedan productos sin coincidencia.'
                      : 'Ningún producto coincide con la búsqueda.'}
                  </td>
                </tr>
              )}
              {visibles.map(p => {
                const texto = nuevosPrecios[p.producto_id] ?? '';
                const invalido = texto.trim() !== '' && parsearPrecioTipeado(texto) === null;

                return (
                  <tr key={p.producto_id}>
                    <td>{p.codigo_barras ? <code>{p.codigo_barras}</code> : <span className="precios-nombre-csv">Sin código</span>}</td>
                    <td>
                      <strong>{p.nombre}</strong>
                      <span className="precios-etiqueta precios-etiqueta--neutra">{ETIQUETA_MOTIVO[p.motivo]}</span>
                      {p.motivo === 'duplicado_en_csv' && p.precios_csv && (
                        <span className="precios-nombre-csv">
                          El CSV trae este código con precios distintos: {p.precios_csv.map(v => `$${formatPrecio(v)}`).join(' / ')}
                        </span>
                      )}
                    </td>
                    <td>
                      ${formatPrecio(p.precio_actual)}
                      {p.en_oferta && p.precio_oferta_actual !== null && (
                        <span className="precios-nombre-csv">
                          En oferta a ${formatPrecio(p.precio_oferta_actual)}: se recalcula manteniendo el %
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={`precios-input${invalido ? ' precios-input--invalido' : ''}`}
                        placeholder="0,00"
                        value={texto}
                        onChange={e => setNuevosPrecios(prev => ({ ...prev, [p.producto_id]: e.target.value }))}
                        aria-label={`Nuevo precio de ${p.nombre}`}
                        aria-invalid={invalido}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginacionSimple pagina={pagina} totalPaginas={totalPaginas} onCambiar={irA} />

        <div className="modal-cancelar-pedido__acciones">
          <span className="modal-precios__contador">
            {invalidos > 0
              ? `${invalidos} precio${invalidos === 1 ? '' : 's'} con formato inválido`
              : `${modificados.length} precio${modificados.length === 1 ? '' : 's'} para guardar`}
          </span>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={aplicando}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleGuardar}
            disabled={aplicando || modificados.length === 0 || invalidos > 0}
          >
            {aplicando ? 'Guardando…' : `Guardar ${modificados.length} precio${modificados.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
