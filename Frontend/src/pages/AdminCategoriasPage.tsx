import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useCategorias } from '../hooks/useCategorias';
import { crearCategoria, actualizarCategoria } from '../api/productos.api';
import type { Categoria } from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';
import { EliminarCategoriaModal } from '../components/admin/EliminarCategoriaModal';

const FORM_CATEGORIA_VACIO = { nombre: '', id_padre: '' };

export function AdminCategoriasPage() {
  const { categorias, cargando: cargandoCategorias, error: errorCategorias, recargar: recargarCategorias } =
    useCategorias();

  // — Categorías —
  const [formCategoria, setFormCategoria] = useState(FORM_CATEGORIA_VACIO);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [errorCategoriaForm, setErrorCategoriaForm] = useState<string | null>(null);

  function iniciarEdicionCategoria(c: Categoria) {
    setCategoriaEditando(c);
    setFormCategoria({ nombre: c.nombre, id_padre: c.id_padre ?? '' });
    setErrorCategoriaForm(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicionCategoria() {
    setCategoriaEditando(null);
    setFormCategoria(FORM_CATEGORIA_VACIO);
    setErrorCategoriaForm(null);
  }

  async function handleSubmitCategoria(e: React.FormEvent) {
    e.preventDefault();
    setErrorCategoriaForm(null);
    if (!formCategoria.nombre.trim()) {
      setErrorCategoriaForm('El nombre es obligatorio.');
      return;
    }
    setGuardandoCategoria(true);
    try {
      const payload = {
        nombre: formCategoria.nombre.trim(),
        id_padre: formCategoria.id_padre || undefined,
      };
      if (categoriaEditando) {
        await actualizarCategoria(categoriaEditando.id, {
          nombre: payload.nombre,
          id_padre: formCategoria.id_padre || null,
        });
      } else {
        await crearCategoria(payload);
      }
      cancelarEdicionCategoria();
      recargarCategorias();
    } catch {
      setErrorCategoriaForm('Error al guardar la categoría. Intentá de nuevo.');
    } finally {
      setGuardandoCategoria(false);
    }
  }

  const [categoriaAEliminar, setCategoriaAEliminar] = useState<Categoria | null>(null);

  function handleEliminarCategoria(c: Categoria) {
    setCategoriaAEliminar(c);
  }

  const [busquedaCategoria, setBusquedaCategoria] = useState('');
  const [busquedaCategoriaDebounced, setBusquedaCategoriaDebounced] = useState('');
  const debounceCategoriaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleBuscarCategoria(valor: string) {
    setBusquedaCategoria(valor);
    if (debounceCategoriaRef.current) clearTimeout(debounceCategoriaRef.current);
    debounceCategoriaRef.current = setTimeout(() => setBusquedaCategoriaDebounced(valor), 300);
  }

  const categoriasFiltradas = categorias.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCategoriaDebounced.toLowerCase())
  );

  const [paginaCategoria, setPaginaCategoria] = useState(1);
  const TAMANO_PAGINA_CATEGORIAS = 20;
  const totalPaginasCategoria = Math.max(1, Math.ceil(categoriasFiltradas.length / TAMANO_PAGINA_CATEGORIAS));
  const categoriasPagina = categoriasFiltradas.slice(
    (paginaCategoria - 1) * TAMANO_PAGINA_CATEGORIAS,
    paginaCategoria * TAMANO_PAGINA_CATEGORIAS
  );

  useEffect(() => {
    setPaginaCategoria(1);
  }, [busquedaCategoriaDebounced]);

  return (
    <AdminLayout>
      <div className="admin-section">
        <div className={`admin-form-card${categoriaEditando ? ' admin-form-card--editando' : ''}`}>
          <h2>{categoriaEditando ? `Editando: ${categoriaEditando.nombre}` : 'Agregar categoría'}</h2>

          {errorCategoriaForm && <div className="admin-error">{errorCategoriaForm}</div>}

          <form onSubmit={handleSubmitCategoria} className="admin-form">
            <div className="admin-form-grid">
              <div className="form-group">
                <label htmlFor="c-nombre">Nombre *</label>
                <input
                  id="c-nombre"
                  type="text"
                  value={formCategoria.nombre}
                  onChange={e => setFormCategoria(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Analgésicos"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="c-parent">Categoría padre (opcional)</label>
                <select
                  id="c-parent"
                  value={formCategoria.id_padre}
                  onChange={e => setFormCategoria(f => ({ ...f, id_padre: e.target.value }))}
                >
                  <option value="">— Categoría raíz —</option>
                  {categorias
                    .filter(c => c.id !== categoriaEditando?.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={guardandoCategoria}>
                {guardandoCategoria ? 'Guardando...' : categoriaEditando ? 'Guardar cambios' : 'Agregar categoría'}
              </button>
              {categoriaEditando && (
                <button type="button" className="btn btn-secondary" onClick={cancelarEdicionCategoria}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-table-card">
          <h2>Categorías ({categoriasFiltradas.length})</h2>

          <div className="form-group">
            <label>Buscar por nombre</label>
            <input
              type="text"
              placeholder="Buscar categoría…"
              value={busquedaCategoria}
              onChange={e => handleBuscarCategoria(e.target.value)}
            />
          </div>

          {cargandoCategorias && <p className="admin-loading">Cargando categorías...</p>}
          {errorCategorias && <div className="admin-error">{errorCategorias}</div>}

          {!cargandoCategorias && categorias.length === 0 && (
            <p className="admin-empty">No hay categorías creadas aún.</p>
          )}

          {!cargandoCategorias && categorias.length > 0 && categoriasFiltradas.length === 0 && (
            <p className="admin-empty">No hay categorías que coincidan con la búsqueda.</p>
          )}

          {categoriasFiltradas.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Categoría padre</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categoriasPagina.map(c => (
                    <tr key={c.id} className={categoriaEditando?.id === c.id ? 'row-editando' : ''}>
                      <td>{c.nombre}</td>
                      <td>{c.id_padre ? (categorias.find(p => p.id === c.id_padre)?.nombre ?? '—') : <span style={{color:'#aaa'}}>Raíz</span>}</td>
                      <td className="acciones">
                        <button className="btn-tabla btn-editar" onClick={() => iniciarEdicionCategoria(c)} aria-label="Editar categoría" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="btn-tabla btn-eliminar" onClick={() => handleEliminarCategoria(c)} aria-label="Eliminar categoría" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {categoriasFiltradas.length > 0 && (
            <div className="pagination">
              <button
                className="btn btn--ghost"
                onClick={() => setPaginaCategoria(p => p - 1)}
                disabled={paginaCategoria === 1}
              >
                ← Anterior
              </button>
              <span className="pagination__info">Página {paginaCategoria} de {totalPaginasCategoria}</span>
              <button
                className="btn btn--ghost"
                onClick={() => setPaginaCategoria(p => p + 1)}
                disabled={paginaCategoria >= totalPaginasCategoria}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>

      {categoriaAEliminar && (
        <EliminarCategoriaModal
          categoria={categoriaAEliminar}
          onClose={() => setCategoriaAEliminar(null)}
          onEliminada={() => {
            setCategoriaAEliminar(null);
            recargarCategorias();
          }}
        />
      )}
    </AdminLayout>
  );
}
