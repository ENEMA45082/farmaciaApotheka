import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useState, useEffect } from 'react';
import type { Categoria } from '../../types';
import { formatPrecio } from '../../types';

interface Props {
  titulo: string;
  esBusqueda: boolean;
  onLimpiarBusqueda?: () => void;
  total: number;
  precioMin: number;
  precioMax: number;
  precioSeleccionado: [number, number];
  onCambiarPrecio: (min: number, max: number) => void;
  categoriasRaiz: Categoria[];
  categoriasSeleccionadas: string[];
  onToggleCategoria: (id: string) => void;
  enOferta: boolean;
  onToggleEnOferta: () => void;
}

export function FiltrosSidebar({
  titulo,
  esBusqueda,
  onLimpiarBusqueda,
  total,
  precioMin,
  precioMax,
  precioSeleccionado,
  onCambiarPrecio,
  categoriasRaiz,
  categoriasSeleccionadas,
  onToggleCategoria,
  enOferta,
  onToggleEnOferta,
}: Props) {
  // Estado local para que el arrastre del slider se sienta fluido
  // sin disparar un refiltrado en cada pixel de movimiento.
  const [precioLocal, setPrecioLocal] = useState<[number, number]>(precioSeleccionado);

  useEffect(() => {
    setPrecioLocal(precioSeleccionado);
  }, [precioSeleccionado[0], precioSeleccionado[1]]);

  const mostrarCategorias = esBusqueda && categoriasRaiz.length > 0;

  return (
    <div className="filtros-sidebar">
      <div className="filtros-sidebar__header">
        <h2 className="filtros-sidebar__titulo">{titulo}</h2>
        <p className="filtros-sidebar__total">{total} resultados encontrados</p>
        {esBusqueda && onLimpiarBusqueda && (
          <button type="button" className="search-result-clear" onClick={onLimpiarBusqueda}>
            ✕ Limpiar búsqueda
          </button>
        )}
      </div>

      {precioMin < precioMax && (
        <div className="filtros-sidebar__seccion">
          <h3 className="filtros-sidebar__seccion-titulo">Filtrar por precio</h3>
          <div className="filtros-sidebar__slider-wrap">
            <Slider
              range
              min={precioMin}
              max={precioMax}
              value={precioLocal}
              onChange={value => setPrecioLocal(value as [number, number])}
              onChangeComplete={value => {
                const [min, max] = value as [number, number];
                onCambiarPrecio(min, max);
              }}
            />
          </div>
          <p className="filtros-sidebar__precio-valores">
            $ {formatPrecio(precioLocal[0])} - $ {formatPrecio(precioLocal[1])}
          </p>
        </div>
      )}

      {mostrarCategorias && (
        <div className="filtros-sidebar__seccion">
          <h3 className="filtros-sidebar__seccion-titulo">Categoría</h3>
          <div className="filtros-sidebar__checkboxes">
            {categoriasRaiz.map(cat => (
              <label key={cat.id} className="filtros-sidebar__checkbox-label">
                <input
                  type="checkbox"
                  checked={categoriasSeleccionadas.includes(cat.id)}
                  onChange={() => onToggleCategoria(cat.id)}
                />
                {cat.nombre}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="filtros-sidebar__seccion">
        <h3 className="filtros-sidebar__seccion-titulo">Ofertas</h3>
        <div className="filtros-sidebar__checkboxes">
          <label className="filtros-sidebar__checkbox-label">
            <input type="checkbox" checked={enOferta} onChange={onToggleEnOferta} />
            En oferta
          </label>
        </div>
      </div>
    </div>
  );
}
