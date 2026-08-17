import { useState, useEffect, useCallback } from 'react';
import { Pencil } from 'lucide-react';
import { crearPremio, listarPremiosAdmin, actualizarPremio, listarCanjesAdmin } from '../api/puntos.api';
import type { Premio, CanjePremioConDetalle } from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';

const FORM_VACIO = {
  nombre: '',
  descripcion: '',
  imagen_url: '',
  costo_puntos: '',
  stock: '',
};

// Vacío o inválido -> null (ilimitado); número -> el valor.
function numeroONull(valor: string): number | null {
  const n = Number(valor);
  return valor.trim() === '' || Number.isNaN(n) ? null : n;
}

export function AdminPuntosPage() {
  const [premios, setPremios] = useState<Premio[]>([]);
  const [cargandoPremios, setCargandoPremios] = useState(true);
  const [errorPremios, setErrorPremios] = useState<string | null>(null);

  const [form, setForm]                   = useState(FORM_VACIO);
  const [premioEditando, setPremioEditando] = useState<Premio | null>(null);
  const [guardando, setGuardando]         = useState(false);
  const [errorForm, setErrorForm]         = useState<string | null>(null);

  const [canjes, setCanjes]             = useState<CanjePremioConDetalle[]>([]);
  const [cargandoCanjes, setCargandoCanjes] = useState(true);
  const [errorCanjes, setErrorCanjes]     = useState<string | null>(null);

  const cargarPremios = useCallback(async () => {
    setCargandoPremios(true);
    setErrorPremios(null);
    try {
      setPremios(await listarPremiosAdmin());
    } catch {
      setErrorPremios('Error al cargar los premios.');
    } finally {
      setCargandoPremios(false);
    }
  }, []);

  const cargarCanjes = useCallback(async () => {
    setCargandoCanjes(true);
    setErrorCanjes(null);
    try {
      setCanjes(await listarCanjesAdmin());
    } catch {
      setErrorCanjes('Error al cargar los canjes.');
    } finally {
      setCargandoCanjes(false);
    }
  }, []);

  useEffect(() => { cargarPremios(); }, [cargarPremios]);
  useEffect(() => { cargarCanjes(); }, [cargarCanjes]);

  function iniciarEdicion(p: Premio) {
    setPremioEditando(p);
    setForm({
      nombre:       p.nombre,
      descripcion:  p.descripcion ?? '',
      imagen_url:   p.imagen_url ?? '',
      costo_puntos: String(p.costo_puntos),
      stock:        p.stock != null ? String(p.stock) : '',
    });
    setErrorForm(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicion() {
    setPremioEditando(null);
    setForm(FORM_VACIO);
    setErrorForm(null);
  }

  async function handleTogglePausa(p: Premio) {
    try {
      await actualizarPremio(p.id, { activo: !p.activo });
      cargarPremios();
    } catch {
      setErrorPremios('Error al pausar/reactivar el premio.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);

    if (!form.nombre.trim()) {
      setErrorForm('El nombre es obligatorio.');
      return;
    }
    if (!form.costo_puntos || Number(form.costo_puntos) <= 0) {
      setErrorForm('El costo en puntos debe ser mayor a 0.');
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        nombre:       form.nombre.trim(),
        descripcion:  form.descripcion.trim() || null,
        imagen_url:   form.imagen_url.trim() || null,
        costo_puntos: Number(form.costo_puntos),
        stock:        numeroONull(form.stock),
      };
      if (premioEditando) {
        await actualizarPremio(premioEditando.id, datos);
      } else {
        await crearPremio(datos);
      }
      cancelarEdicion();
      cargarPremios();
    } catch {
      setErrorForm('Error al guardar el premio. Verificá los datos e intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AdminLayout subtitle="Catálogo de premios y canjes de clientes">
      <div className="admin-section">
        <div className={`admin-form-card${premioEditando ? ' admin-form-card--editando' : ''}`}>
          <h2>{premioEditando ? `Editando: ${premioEditando.nombre}` : 'Nuevo premio'}</h2>

          {errorForm && <div className="admin-error">{errorForm}</div>}

          <form onSubmit={handleSubmit} className="admin-form">
            <div className="admin-form-grid">
              <div className="form-group">
                <label htmlFor="prem-nombre">Nombre *</label>
                <input
                  id="prem-nombre"
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Termo Apotheka"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="prem-costo">Costo en puntos *</label>
                <input
                  id="prem-costo"
                  type="number"
                  min="1"
                  step="1"
                  value={form.costo_puntos}
                  onChange={e => setForm(f => ({ ...f, costo_puntos: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="prem-stock">Stock</label>
                <input
                  id="prem-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                  placeholder="Ilimitado"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prem-imagen">URL de imagen</label>
                <input
                  id="prem-imagen"
                  type="text"
                  value={form.imagen_url}
                  onChange={e => setForm(f => ({ ...f, imagen_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="prem-desc">Descripción</label>
                <input
                  id="prem-desc"
                  type="text"
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Guardando...' : premioEditando ? 'Guardar cambios' : 'Crear premio'}
              </button>
              {premioEditando && (
                <button type="button" className="btn btn-secondary" onClick={cancelarEdicion}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-table-card">
          <h2>Premios ({premios.length})</h2>

          {cargandoPremios && <p className="admin-loading">Cargando premios...</p>}
          {errorPremios && <div className="admin-error">{errorPremios}</div>}
          {!cargandoPremios && premios.length === 0 && (
            <p className="admin-empty">No hay premios creados aún.</p>
          )}

          {premios.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Costo</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {premios.map(p => (
                    <tr key={p.id} className={premioEditando?.id === p.id ? 'row-editando' : ''}>
                      <td>{p.nombre}</td>
                      <td>{p.costo_puntos} pts</td>
                      <td>{p.stock != null ? p.stock : 'Ilimitado'}</td>
                      <td>{p.activo ? 'Activo' : 'Pausado'}</td>
                      <td className="acciones">
                        <button className="btn-tabla btn-editar" onClick={() => iniciarEdicion(p)} aria-label="Editar premio" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={() => handleTogglePausa(p)}>
                          {p.activo ? 'Pausar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-table-card">
          <h2>Canjes realizados ({canjes.length})</h2>

          {cargandoCanjes && <p className="admin-loading">Cargando canjes...</p>}
          {errorCanjes && <div className="admin-error">{errorCanjes}</div>}
          {!cargandoCanjes && canjes.length === 0 && (
            <p className="admin-empty">Todavía no hay canjes para gestionar.</p>
          )}

          {canjes.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Premio</th>
                    <th>Puntos gastados</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {canjes.map(c => (
                    <tr key={c.id}>
                      <td>{c.premio_nombre}</td>
                      <td>{c.puntos_gastados} pts</td>
                      <td>{new Date(c.canjeado_en).toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
