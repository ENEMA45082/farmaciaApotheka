import { useMemo, useState } from 'react';
import { aplicarCambiosPrecio } from '../../api/productos.api';
import type { CoincidenciaPrecio } from '../../api/productos.api';
import { usePaginacionLocal } from '../../hooks/usePaginacionLocal';
import { mensajeDeErrorApi } from '../../utils/mensajeError';
import { formatPrecio } from '../../types';
import { PaginacionSimple } from './PaginacionSimple';

const POR_PAGINA = 50;
const UMBRAL_VARIACION_ALTA = 30;

type Filtro = 'todos' | 'suben' | 'bajan' | 'nombre_distinto';

interface Props {
  abierto: boolean;
  coincidencias: CoincidenciaPrecio[];
  onClose: () => void;
  onAplicados: (productoIds: string[]) => void;
}

function variacionPorcentual(c: CoincidenciaPrecio): number | null {
  return c.precio_actual > 0 ? ((c.precio_nuevo - c.precio_actual) / c.precio_actual) * 100 : null;
}

function formatPorcentaje(pct: number): string {
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}%`;
}

// El estado (decisiones de aceptar/rechazar, buscador) vive mientras la página
// mantenga montado el modal, así cerrarlo y volver a abrirlo no pierde lo que
// ya se revisó. La página lo remonta (key) en cada análisis nuevo.
export function RevisarCambiosPreciosModal({ abierto, coincidencias, onClose, onAplicados }: Props) {
  // Lo que parece ser otro producto viene rechazado de entrada: hay que
  // aceptarlo a propósito.
  const [rechazados, setRechazados] = useState<Set<string>>(
    () => new Set(coincidencias.filter(c => c.nombre_distinto).map(c => c.producto_id)),
  );
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro]     = useState<Filtro>('todos');
  const [aplicando, setAplicando] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [fallidos, setFallidos]   = useState<{ producto_id: string; razon: string }[]>([]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return coincidencias.filter(c => {
      if (filtro === 'suben' && c.precio_nuevo <= c.precio_actual) return false;
      if (filtro === 'bajan' && c.precio_nuevo >= c.precio_actual) return false;
      if (filtro === 'nombre_distinto' && !c.nombre_distinto) return false;
      if (!q) return true;
      return c.nombre.toLowerCase().includes(q)
        || c.nombre_csv.toLowerCase().includes(q)
        || c.codigo_barras.includes(q);
    });
  }, [coincidencias, busqueda, filtro]);

  const { pagina, totalPaginas, visibles, irA } = usePaginacionLocal(filtradas, POR_PAGINA);

  const aceptadas = coincidencias.filter(c => !rechazados.has(c.producto_id));

  if (!abierto) return null;

  function marcar(filas: CoincidenciaPrecio[], aceptar: boolean) {
    setRechazados(prev => {
      const siguiente = new Set(prev);
      for (const c of filas) {
        if (aceptar) siguiente.delete(c.producto_id);
        else siguiente.add(c.producto_id);
      }
      return siguiente;
    });
  }

  async function handleAplicar() {
    setAplicando(true);
    setError(null);
    setFallidos([]);

    const resultado = await aplicarCambiosPrecio(
      aceptadas.map(c => ({ producto_id: c.producto_id, precio_nuevo: c.precio_nuevo })),
    );

    if (resultado.aplicados.length > 0) onAplicados(resultado.aplicados);
    setFallidos(resultado.fallidos);
    if (resultado.errorGeneral) {
      setError(mensajeDeErrorApi(
        resultado.errorGeneral,
        'No se pudieron aplicar todos los cambios. Revisá la lista e intentá de nuevo.',
      ));
    }
    setAplicando(false);

    if (!resultado.errorGeneral && resultado.fallidos.length === 0) onClose();
  }

  const nombreDe = (id: string) => coincidencias.find(c => c.producto_id === id)?.nombre ?? id;

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

        <h2 className="modal-cancelar-pedido__titulo">Cambios de precio encontrados</h2>
        <p className="modal-precios__ayuda">
          Estos productos están en el sistema y en el CSV con un precio distinto. Dejá tildados los
          cambios que querés aplicar y destildá los que querés rechazar.
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
            value={filtro}
            onChange={e => { setFiltro(e.target.value as Filtro); irA(1); }}
            aria-label="Filtrar cambios"
          >
            <option value="todos">Todos</option>
            <option value="suben">Suben de precio</option>
            <option value="bajan">Bajan de precio</option>
            <option value="nombre_distinto">Nombre distinto</option>
          </select>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => marcar(filtradas, true)}>
            Aceptar todos ({filtradas.length})
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => marcar(filtradas, false)}>
            Rechazar todos ({filtradas.length})
          </button>
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
                <th>Aplicar</th>
                <th>Código</th>
                <th>Producto</th>
                <th>Precio actual</th>
                <th>Precio CSV</th>
                <th>Variación</th>
                <th>Oferta</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={7} className="modal-precios__vacio">
                    {coincidencias.length === 0
                      ? 'No hay cambios de precio pendientes.'
                      : 'Ningún cambio coincide con la búsqueda.'}
                  </td>
                </tr>
              )}
              {visibles.map(c => {
                const aceptado = !rechazados.has(c.producto_id);
                const diff = c.precio_nuevo - c.precio_actual;
                const pct  = variacionPorcentual(c);
                const alta = pct !== null && Math.abs(pct) >= UMBRAL_VARIACION_ALTA;
                const clases = [
                  !aceptado && 'precios-fila--rechazada',
                  alta && 'precios-fila--alerta',
                ].filter(Boolean).join(' ');

                return (
                  <tr key={c.producto_id} className={clases}>
                    <td>
                      <input
                        type="checkbox"
                        checked={aceptado}
                        onChange={() => marcar([c], !aceptado)}
                        aria-label={`Aplicar el cambio de precio de ${c.nombre}`}
                      />
                    </td>
                    <td><code>{c.codigo_barras}</code></td>
                    <td>
                      <strong>{c.nombre}</strong>
                      <span className="precios-nombre-csv">CSV: {c.nombre_csv || '(sin nombre)'}</span>
                      {c.nombre_distinto && (
                        <span className="precios-etiqueta" title="El nombre del CSV casi no se parece al del sistema: puede ser otro producto con el mismo código.">
                          Nombre distinto
                        </span>
                      )}
                    </td>
                    <td>${formatPrecio(c.precio_actual)}</td>
                    <td><strong>${formatPrecio(c.precio_nuevo)}</strong></td>
                    <td style={{ color: diff > 0 ? '#166534' : '#991b1b', whiteSpace: 'nowrap' }}>
                      {diff > 0 ? '+' : '-'}${formatPrecio(Math.abs(diff))}
                      {pct !== null && <> ({formatPorcentaje(pct)})</>}
                      {alta && (
                        <span title={`Variación de ${UMBRAL_VARIACION_ALTA}% o más: revisá que el precio del CSV sea correcto.`}> ⚠</span>
                      )}
                    </td>
                    <td>
                      {c.precio_oferta_nuevo !== null && c.precio_oferta_actual !== null
                        ? <>${formatPrecio(c.precio_oferta_actual)} → <strong>${formatPrecio(c.precio_oferta_nuevo)}</strong></>
                        : '—'}
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
            {aceptadas.length} de {coincidencias.length} aceptados
          </span>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={aplicando}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleAplicar}
            disabled={aplicando || aceptadas.length === 0}
          >
            {aplicando ? 'Aplicando…' : `Aplicar ${aceptadas.length} cambio${aceptadas.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
