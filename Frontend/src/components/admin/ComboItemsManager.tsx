import { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { fetchProductos } from '../../api/productos.api';
import {
  fetchComboItems,
  agregarComboItem,
  actualizarComboItem,
  eliminarComboItem,
} from '../../api/comboItems.api';
import type { Producto, ComboItem } from '../../types';
import { formatPrecio, precioEfectivo } from '../../types';

interface Props {
  combo: Producto;
}

export function ComboItemsManager({ combo }: Props) {
  const [items, setItems] = useState<ComboItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    fetchComboItems(combo.id)
      .then(setItems)
      .catch(() => setError('No se pudo cargar la composición del combo.'))
      .finally(() => setCargando(false));
  }, [combo.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [cantidadNueva, setCantidadNueva] = useState('1');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function buscar(query: string) {
    if (query.trim().length < 2) { setResultados([]); return; }
    setBuscando(true);
    try {
      const yaAgregados = new Set(items.map(i => i.producto_id));
      const resultado = await fetchProductos({ busqueda: query.trim(), limite: 8 });
      // Excluye lo ya agregado, el combo mismo, y otros combos (no anidable
      // — comboItems.service.ts::agregar igual lo rechazaría, pero
      // filtrarlo acá evita el viaje redondo).
      setResultados(resultado.datos.filter(p => !yaAgregados.has(p.id) && p.id !== combo.id && !p.es_combo));
      setMostrarResultados(true);
    } catch {
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }

  function handleBusquedaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    setBusqueda(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(valor), 300);
  }

  async function handleAgregar(producto: Producto) {
    setError(null);
    const cantidad = parseInt(cantidadNueva) || 1;
    try {
      await agregarComboItem({ combo_id: combo.id, producto_id: producto.id, cantidad });
      setBusqueda('');
      setResultados([]);
      setMostrarResultados(false);
      setCantidadNueva('1');
      cargar();
    } catch {
      setError('No se pudo agregar el componente. Puede que ya esté agregado.');
    }
  }

  async function handleCambiarCantidad(item: ComboItem, cantidad: number) {
    if (!cantidad || cantidad < 1 || cantidad === item.cantidad) return;
    try {
      await actualizarComboItem(item.id, { cantidad });
      cargar();
    } catch {
      setError('No se pudo actualizar la cantidad.');
    }
  }

  async function handleQuitar(item: ComboItem) {
    setError(null);
    try {
      await eliminarComboItem(item.id);
      cargar();
    } catch {
      setError('No se pudo quitar el componente.');
    }
  }

  return (
    <div className="admin-form-card">
      <h2>Composición del combo</h2>
      <p className="admin-subtitle">
        Elegí qué productos reales forman "{combo.nombre}" y en qué cantidad. El stock del combo se calcula
        solo, según el stock disponible de estos productos.
      </p>

      {error && <div className="admin-error">{error}</div>}

      <div className="form-group admin-buscador-producto">
        <label htmlFor="buscar-componente-combo">Agregar componente</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            id="buscar-componente-combo"
            type="text"
            value={busqueda}
            onChange={handleBusquedaChange}
            onFocus={() => resultados.length > 0 && setMostrarResultados(true)}
            onBlur={() => setTimeout(() => setMostrarResultados(false), 150)}
            placeholder="Escribí el nombre de un producto..."
            autoComplete="off"
            style={{ flex: 1 }}
          />
          <input
            type="number"
            min="1"
            value={cantidadNueva}
            onChange={e => setCantidadNueva(e.target.value)}
            style={{ width: '5rem' }}
            aria-label="Cantidad"
          />
        </div>

        {mostrarResultados && resultados.length > 0 && (
          <ul className="admin-buscador-producto__lista">
            {resultados.map(p => (
              <li key={p.id}>
                <button type="button" className="admin-buscador-producto__item" onMouseDown={() => handleAgregar(p)}>
                  <img src={p.imagen_url ?? p.imagenes[0] ?? ''} alt="" className="admin-buscador-producto__thumb" />
                  <span className="admin-buscador-producto__info">
                    <span className="admin-buscador-producto__nombre">{p.nombre}</span>
                    <span className="admin-buscador-producto__precio">${formatPrecio(precioEfectivo(p))} · Stock: {p.stock}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {mostrarResultados && !buscando && busqueda.trim().length >= 2 && resultados.length === 0 && (
          <ul className="admin-buscador-producto__lista">
            <li className="admin-buscador-producto__vacio">No se encontraron productos disponibles para agregar.</li>
          </ul>
        )}
      </div>

      {cargando && <p className="admin-loading">Cargando composición...</p>}
      {!cargando && items.length > 0 && items.length < 2 && (
        <p className="admin-aviso">
          Este combo tiene solo {items.length} componente. Agregá al menos 2 productos distintos para que
          tenga stock disponible.
        </p>
      )}
      {!cargando && items.length === 0 && (
        <p className="admin-empty">Todavía no agregaste componentes a este combo.</p>
      )}

      {items.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr><th>Imagen</th><th>Nombre</th><th>Cantidad</th><th>Stock del componente</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><img src={item.producto?.imagen_url ?? ''} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /></td>
                  <td>{item.producto?.nombre}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      defaultValue={item.cantidad}
                      style={{ width: '4rem' }}
                      onBlur={e => handleCambiarCantidad(item, parseInt(e.target.value))}
                    />
                  </td>
                  <td>{item.producto?.stock ?? '—'}</td>
                  <td className="acciones">
                    <button className="btn-tabla btn-eliminar" onClick={() => handleQuitar(item)} aria-label="Quitar componente" title="Quitar">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
