import { useState, useEffect, useCallback } from 'react';
import { Pencil } from 'lucide-react';
import { crearCupon, listarCuponesAdmin, actualizarCupon } from '../api/cupones.api';
import type { CuponConUsos, TipoCupon } from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';

const FORM_VACIO = {
  codigo: '',
  tipo: 'porcentaje' as TipoCupon,
  valor: '',
  compra_minima: '',
  descuento_maximo: '',
  limite_usos_total: '',
  limite_usos_por_cliente: '',
  valido_desde: '',
  valido_hasta: '',
};

// Vacío o inválido -> null (limpia el campo); número -> el valor.
function numeroONull(valor: string): number | null {
  const n = Number(valor);
  return valor.trim() === '' || Number.isNaN(n) ? null : n;
}

export function AdminCuponesPage() {
  const [cupones, setCupones]   = useState<CuponConUsos[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [form, setForm]                 = useState(FORM_VACIO);
  const [cuponEditando, setCuponEditando] = useState<CuponConUsos | null>(null);
  const [guardando, setGuardando]       = useState(false);
  const [errorForm, setErrorForm]       = useState<string | null>(null);

  const cargarCupones = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      setCupones(await listarCuponesAdmin());
    } catch {
      setErrorCarga('Error al cargar los cupones.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarCupones(); }, [cargarCupones]);

  function iniciarEdicion(c: CuponConUsos) {
    setCuponEditando(c);
    setForm({
      codigo: c.codigo,
      tipo: c.tipo,
      valor: String(c.valor),
      compra_minima: String(c.compra_minima),
      descuento_maximo: c.descuento_maximo != null ? String(c.descuento_maximo) : '',
      limite_usos_total: c.limite_usos_total != null ? String(c.limite_usos_total) : '',
      limite_usos_por_cliente: c.limite_usos_por_cliente != null ? String(c.limite_usos_por_cliente) : '',
      valido_desde: c.valido_desde ? c.valido_desde.slice(0, 10) : '',
      valido_hasta: c.valido_hasta ? c.valido_hasta.slice(0, 10) : '',
    });
    setErrorForm(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicion() {
    setCuponEditando(null);
    setForm(FORM_VACIO);
    setErrorForm(null);
  }

  async function handleTogglePausa(c: CuponConUsos) {
    try {
      await actualizarCupon(c.id, { activo: !c.activo });
      cargarCupones();
    } catch {
      setErrorCarga('Error al pausar/reactivar el cupón.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);

    if (!form.codigo.trim()) {
      setErrorForm('El código es obligatorio.');
      return;
    }
    if (!form.valor || Number(form.valor) <= 0) {
      setErrorForm('El valor debe ser mayor a 0.');
      return;
    }

    setGuardando(true);
    try {
      if (cuponEditando) {
        await actualizarCupon(cuponEditando.id, {
          tipo: form.tipo,
          valor: Number(form.valor),
          compra_minima: Number(form.compra_minima || 0),
          descuento_maximo: numeroONull(form.descuento_maximo),
          limite_usos_total: numeroONull(form.limite_usos_total),
          limite_usos_por_cliente: numeroONull(form.limite_usos_por_cliente),
          valido_desde: form.valido_desde || null,
          valido_hasta: form.valido_hasta || null,
        });
      } else {
        await crearCupon({
          codigo: form.codigo,
          tipo: form.tipo,
          valor: Number(form.valor),
          compra_minima: Number(form.compra_minima || 0),
          descuento_maximo: numeroONull(form.descuento_maximo),
          limite_usos_total: numeroONull(form.limite_usos_total),
          limite_usos_por_cliente: numeroONull(form.limite_usos_por_cliente),
          valido_desde: form.valido_desde || null,
          valido_hasta: form.valido_hasta || null,
        });
      }
      cancelarEdicion();
      cargarCupones();
    } catch {
      setErrorForm('Error al guardar el cupón. Verificá los datos e intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AdminLayout subtitle="Códigos de descuento y sus límites de uso">
      <div className="admin-section">
        <div className={`admin-form-card${cuponEditando ? ' admin-form-card--editando' : ''}`}>
          <h2>{cuponEditando ? `Editando: ${cuponEditando.codigo}` : 'Nuevo cupón'}</h2>

          {errorForm && <div className="admin-error">{errorForm}</div>}

          <form onSubmit={handleSubmit} className="admin-form">
            <div className="admin-form-grid">
              <div className="form-group">
                <label htmlFor="cup-codigo">Código *</label>
                <input
                  id="cup-codigo"
                  type="text"
                  value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                  placeholder="Ej: VERANO20"
                  disabled={!!cuponEditando}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cup-tipo">Tipo *</label>
                <select
                  id="cup-tipo"
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoCupon }))}
                >
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="fijo">Monto fijo ($)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cup-valor">{form.tipo === 'porcentaje' ? 'Valor (%) *' : 'Valor ($) *'}</label>
                <input
                  id="cup-valor"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cup-compra-minima">Compra mínima ($)</label>
                <input
                  id="cup-compra-minima"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.compra_minima}
                  onChange={e => setForm(f => ({ ...f, compra_minima: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cup-descuento-maximo">Descuento máximo ($)</label>
                <input
                  id="cup-descuento-maximo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.descuento_maximo}
                  onChange={e => setForm(f => ({ ...f, descuento_maximo: e.target.value }))}
                  placeholder="Sin tope"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cup-limite-total">Límite de usos totales</label>
                <input
                  id="cup-limite-total"
                  type="number"
                  min="1"
                  step="1"
                  value={form.limite_usos_total}
                  onChange={e => setForm(f => ({ ...f, limite_usos_total: e.target.value }))}
                  placeholder="Ilimitado"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cup-limite-cliente">Límite de usos por cliente</label>
                <input
                  id="cup-limite-cliente"
                  type="number"
                  min="1"
                  step="1"
                  value={form.limite_usos_por_cliente}
                  onChange={e => setForm(f => ({ ...f, limite_usos_por_cliente: e.target.value }))}
                  placeholder="Ilimitado"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cup-desde">Válido desde</label>
                <input
                  id="cup-desde"
                  type="date"
                  value={form.valido_desde}
                  onChange={e => setForm(f => ({ ...f, valido_desde: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cup-hasta">Válido hasta</label>
                <input
                  id="cup-hasta"
                  type="date"
                  value={form.valido_hasta}
                  onChange={e => setForm(f => ({ ...f, valido_hasta: e.target.value }))}
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Guardando...' : cuponEditando ? 'Guardar cambios' : 'Crear cupón'}
              </button>
              {cuponEditando && (
                <button type="button" className="btn btn-secondary" onClick={cancelarEdicion}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-table-card">
          <h2>Cupones ({cupones.length})</h2>

          {cargando && <p className="admin-loading">Cargando cupones...</p>}
          {errorCarga && <div className="admin-error">{errorCarga}</div>}

          {!cargando && cupones.length === 0 && (
            <p className="admin-empty">No hay cupones creados aún.</p>
          )}

          {cupones.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Compra mínima</th>
                    <th>Usos</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cupones.map(c => (
                    <tr key={c.id} className={cuponEditando?.id === c.id ? 'row-editando' : ''}>
                      <td>{c.codigo}</td>
                      <td>{c.tipo === 'porcentaje' ? 'Porcentaje' : 'Fijo'}</td>
                      <td>{c.tipo === 'porcentaje' ? `${c.valor}%` : `$${c.valor}`}</td>
                      <td>{c.compra_minima > 0 ? `$${c.compra_minima}` : '—'}</td>
                      <td>{c.usos}{c.limite_usos_total != null ? ` / ${c.limite_usos_total}` : ''}</td>
                      <td>
                        {c.valido_desde ? new Date(c.valido_desde).toLocaleDateString('es-AR') : '—'}
                        {' → '}
                        {c.valido_hasta ? new Date(c.valido_hasta).toLocaleDateString('es-AR') : '—'}
                      </td>
                      <td>{c.activo ? 'Activo' : 'Pausado'}</td>
                      <td className="acciones">
                        <button className="btn-tabla btn-editar" onClick={() => iniciarEdicion(c)} aria-label="Editar cupón" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={() => handleTogglePausa(c)}>
                          {c.activo ? 'Pausar' : 'Activar'}
                        </button>
                      </td>
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
