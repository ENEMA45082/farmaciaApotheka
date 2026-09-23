interface Props {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}

export function PaginacionSimple({ pagina, totalPaginas, onCambiar }: Props) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="pagination pagination--compacta">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina === 1}
      >
        ← Anterior
      </button>
      <span className="pagination__info">Página {pagina} de {totalPaginas}</span>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina >= totalPaginas}
      >
        Siguiente →
      </button>
    </div>
  );
}
