import type { Categoria } from '../../types';

interface Props {
  categorias: Categoria[];
  categoriaSeleccionada: string | undefined;
  onCambiarCategoria: (id: string | undefined) => void;
}

export function ProductFilters({ categorias, categoriaSeleccionada, onCambiarCategoria }: Props) {
  return (
    <div className="filters">
      <div className="filters__categories">
        <button
          className={`filter-btn ${!categoriaSeleccionada ? 'filter-btn--active' : ''}`}
          onClick={() => onCambiarCategoria(undefined)}
        >
          Todos
        </button>
        {categorias.map(cat => (
          <button
            key={cat.id}
            className={`filter-btn ${categoriaSeleccionada === cat.id ? 'filter-btn--active' : ''}`}
            onClick={() => onCambiarCategoria(cat.id)}
          >
            {cat.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
