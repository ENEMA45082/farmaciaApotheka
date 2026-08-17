import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useCategorias } from '../hooks/useCategorias';
import { useCategoriasPaginadas } from '../hooks/useCategoriasPaginadas';
import { crearCategoria, actualizarCategoria } from '../api/productos.api';
import type { Categoria } from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';
import { EliminarCategoriaModal } from '../components/admin/EliminarCategoriaModal';

const FORM_CATEGORIA_VACIO = { nombre: '', id_padre: '' };
const TAMANO_PAGINA_CATEGORIAS = 20;

export function AdminCategoriasPage() {
  // Lista completa: la necesitan el selector de categoría padre del form y
  // la resolución de nombre de "Categoría padre" en la tabla — ninguno de
  // los dos puede limitarse a la página actual.
  const { categorias, recargar: recargarCategoriasCompletas } = useCategorias();

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

  // Búsqueda por click en "Buscar" (no dinámica): tipear no dispara fetch,
  // solo confirmar el input lo hace — así pagina y busqueda siempre cambian
  // juntos en el mismo evento, sin la carrera de "pagina vieja + busqueda
  // nueva" que rompía el .range() del backend con un offset fuera de rango.
  const [busquedaCategoriaInput, setBusquedaCategoriaInput] = useState('');
  const [busquedaCategoriaAplicada, setBusquedaCategoriaAplicada] = useState('');

  const [paginaCategoria, setPaginaCategoria] = useState(1);

  function aplicarBusquedaCategoria(e: React.FormEvent) {
    e.preventDefault();
    setBusquedaCategoriaAplicada(busquedaCategoriaInput.trim());
    setPaginaCategoria(1);
  }

  function limpiarBusquedaCategoria() {
    setBusquedaCategoriaInput('');
    setBusquedaCategoriaAplicada('');
    setPaginaCategoria(1);
  }

  // Tabla: paginada y filtrada en el backend.
  const {
    categorias: categoriasTabla,
    total: totalCategorias,
    totalPaginas: totalPaginasCategoria,
    cargando: cargandoCategorias,
    error: errorCategorias,
    recargar: recargarCategoriasTabla,
  } = useCategoriasPaginadas({
    busqueda: busquedaCategoriaAplicada || undefined,
    pagina: paginaCategoria,
    limite: TAMANO_PAGINA_CATEGORIAS,
  });

  function recargarTodo() {
    recargarCategoriasTabla();
    recargarCategoriasCompletas();
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
      recargarTodo();
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

  return (
    <AdminLayout subtitle="Organizá las categorías de la tienda">
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
          <h2>Categorías ({totalCategorias})</h2>

          <form className="form-group" onSubmit={aplicarBusquedaCategoria}>
            <label htmlFor="cat-busqueda">Buscar por nombre</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="cat-busqueda"
                type="text"
                placeholder="Buscar categoría…"
                value={busquedaCategoriaInput}
                onChange={e => setBusquedaCategoriaInput(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary">Buscar</button>
              {busquedaCategoriaAplicada && (
                <button type="button" className="btn btn--ghost" onClick={limpiarBusquedaCategoria}>
                  Limpiar
                </button>
              )}
            </div>
          </form>

          {cargandoCategorias && <p className="admin-loading">Cargando categorías...</p>}
          {errorCategorias && <div className="admin-error">{errorCategorias}</div>}

          {!cargandoCategorias && totalCategorias === 0 && !busquedaCategoriaAplicada && (
            <p className="admin-empty">No hay categorías creadas aún.</p>
          )}

          {!cargandoCategorias && totalCategorias === 0 && busquedaCategoriaAplicada && (
            <p className="admin-empty">No hay categorías que coincidan con la búsqueda.</p>
          )}

          {categoriasTabla.length > 0 && (
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
                  {categoriasTabla.map(c => (
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

          {totalCategorias > 0 && (
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
            recargarTodo();
          }}
        />
      )}
    </AdminLayout>
  );
}
