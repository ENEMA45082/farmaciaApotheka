import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Pencil } from 'lucide-react';
import {
  crearPremio,
  listarPremiosAdmin,
  actualizarPremio,
  listarCanjesAdmin,
  buscarClientePorDni,
  acreditarPuntosManual,
  crearClienteFisico,
} from '../api/puntos.api';
import type { Premio, CanjePremioConDetalle, ClienteBusquedaDNI } from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';
import { esCuitValido } from '../utils/validarDocumento';

function nombreCliente(c: ClienteBusquedaDNI): string {
  const partes = [c.nombre, c.apellido].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : (c.email ?? 'Cliente sin nombre cargado');
}

const FORM_VACIO = {
  nombre: '',
  descripcion: '',
  imagen_url: '',
  costo_puntos: '',
  stock: '',
};

const FORM_ALTA_VACIO = {
  nombre: '',
  apellido: '',
  dni: '',
  telefono: '',
  email: '',
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

  const [dniBusqueda, setDniBusqueda]           = useState('');
  const [buscandoCliente, setBuscandoCliente]   = useState(false);
  const [errorBusqueda, setErrorBusqueda]       = useState<string | null>(null);
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteBusquedaDNI[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteBusquedaDNI | null>(null);

  // Alta de "cliente físico" — cuando la búsqueda no encuentra a nadie.
  const [clienteNoEncontrado, setClienteNoEncontrado] = useState(false);
  const [formAlta, setFormAlta]           = useState(FORM_ALTA_VACIO);
  const [errorAlta, setErrorAlta]         = useState<string | null>(null);
  const [creandoCliente, setCreandoCliente] = useState(false);

  const [puntosACargar, setPuntosACargar] = useState('');
  const [motivoCarga, setMotivoCarga]     = useState('');
  const [acreditando, setAcreditando]     = useState(false);
  const [errorAcreditar, setErrorAcreditar] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito]     = useState<string | null>(null);

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

  function reiniciarBusquedaCliente() {
    setDniBusqueda('');
    setErrorBusqueda(null);
    setClientesEncontrados([]);
    setClienteSeleccionado(null);
    setPuntosACargar('');
    setMotivoCarga('');
    setErrorAcreditar(null);
    setMensajeExito(null);
    setClienteNoEncontrado(false);
    setFormAlta(FORM_ALTA_VACIO);
    setErrorAlta(null);
  }

  function seleccionarCliente(c: ClienteBusquedaDNI) {
    setClienteSeleccionado(c);
    setErrorAcreditar(null);
    setMensajeExito(null);
  }

  async function handleBuscarCliente(e: React.FormEvent) {
    e.preventDefault();
    setErrorBusqueda(null);
    setMensajeExito(null);
    setClientesEncontrados([]);
    setClienteSeleccionado(null);
    setClienteNoEncontrado(false);
    setErrorAlta(null);

    if (!dniBusqueda.trim()) {
      setErrorBusqueda('Ingresá un CUIT para buscar.');
      return;
    }

    setBuscandoCliente(true);
    try {
      const clientes = await buscarClientePorDni(dniBusqueda.trim());
      setClientesEncontrados(clientes);
      if (clientes.length === 1) setClienteSeleccionado(clientes[0]);
    } catch (err) {
      const data = axios.isAxiosError(err) ? err.response?.data : null;
      setErrorBusqueda(data?.error ?? 'Error al buscar el cliente.');
      if (data?.code === 'CLIENTE_NOT_FOUND') {
        setClienteNoEncontrado(true);
        setFormAlta(f => ({ ...f, dni: dniBusqueda.trim() }));
      }
    } finally {
      setBuscandoCliente(false);
    }
  }

  async function handleCrearClienteFisico(e: React.FormEvent) {
    e.preventDefault();
    setErrorAlta(null);

    if (!formAlta.nombre.trim() || !formAlta.apellido.trim() || !formAlta.telefono.trim()) {
      setErrorAlta('Nombre, apellido y teléfono son obligatorios.');
      return;
    }
    if (!esCuitValido(formAlta.dni)) {
      setErrorAlta('El CUIT no es válido (tiene que tener 11 dígitos y el dígito verificador correcto).');
      return;
    }

    setCreandoCliente(true);
    try {
      const nuevo = await crearClienteFisico({
        nombre:   formAlta.nombre.trim(),
        apellido: formAlta.apellido.trim(),
        dni:      formAlta.dni.trim(),
        telefono: formAlta.telefono.trim(),
        email:    formAlta.email.trim() || null,
      });
      // Tratarlo igual que si la búsqueda lo hubiera encontrado — reusa el
      // formulario de "Acreditar puntos" de más abajo sin ningún cambio ahí.
      setClientesEncontrados([nuevo]);
      setClienteSeleccionado(nuevo);
      setClienteNoEncontrado(false);
      setFormAlta(FORM_ALTA_VACIO);
      setErrorBusqueda(null);
    } catch (err) {
      const data = axios.isAxiosError(err) ? err.response?.data : null;
      setErrorAlta(data?.error ?? 'Error al crear el cliente. Intentá de nuevo.');
    } finally {
      setCreandoCliente(false);
    }
  }

  async function handleAcreditar(e: React.FormEvent) {
    e.preventDefault();
    setErrorAcreditar(null);
    setMensajeExito(null);
    if (!clienteSeleccionado) return;

    const puntos = Number(puntosACargar);
    if (!puntosACargar.trim() || !Number.isInteger(puntos) || puntos <= 0) {
      setErrorAcreditar('Ingresá una cantidad de puntos válida (número entero mayor a 0).');
      return;
    }

    setAcreditando(true);
    try {
      const { saldo } = await acreditarPuntosManual(clienteSeleccionado.user_id, puntos, motivoCarga);
      setMensajeExito(`Se acreditaron ${puntos} puntos a ${nombreCliente(clienteSeleccionado)}. Nuevo saldo: ${saldo} pts.`);
      setClienteSeleccionado(c => c && { ...c, puntos_saldo: saldo });
      setPuntosACargar('');
      setMotivoCarga('');
    } catch {
      setErrorAcreditar('Error al acreditar los puntos. Intentá de nuevo.');
    } finally {
      setAcreditando(false);
    }
  }

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
        <div className="admin-form-card">
          <h2>Cargar puntos a un cliente</h2>
          <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
            Buscá al cliente por CUIT para acreditarle puntos a mano — por ejemplo, cuando compra en el local y quiere registrar sus puntos.
          </p>

          <form onSubmit={handleBuscarCliente} className="admin-form">
            <div className="admin-form-grid">
              <div className="form-group">
                <label htmlFor="cliente-dni">CUIT del cliente</label>
                <input
                  id="cliente-dni"
                  type="text"
                  inputMode="numeric"
                  value={dniBusqueda}
                  onChange={e => setDniBusqueda(e.target.value)}
                  placeholder="Ej: 30712345678"
                />
              </div>
            </div>

            {errorBusqueda && <div className="admin-error">{errorBusqueda}</div>}

            <div className="admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={buscandoCliente}>
                {buscandoCliente ? 'Buscando...' : 'Buscar cliente'}
              </button>
              {(clientesEncontrados.length > 0 || errorBusqueda) && (
                <button type="button" className="btn btn-secondary" onClick={reiniciarBusquedaCliente}>
                  Nueva búsqueda
                </button>
              )}
            </div>
          </form>

          {clienteNoEncontrado && !clienteSeleccionado && (
            <form onSubmit={handleCrearClienteFisico} className="admin-form" style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <p style={{ marginTop: 0 }}>
                No hay ninguna cuenta con ese CUIT. Si compró en el local, registralo acá para poder cargarle puntos.
              </p>

              {errorAlta && <div className="admin-error">{errorAlta}</div>}

              <div className="admin-form-grid">
                <div className="form-group">
                  <label htmlFor="alta-nombre">Nombre *</label>
                  <input
                    id="alta-nombre"
                    type="text"
                    value={formAlta.nombre}
                    onChange={e => setFormAlta(f => ({ ...f, nombre: e.target.value }))}
                    disabled={creandoCliente}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="alta-apellido">Apellido *</label>
                  <input
                    id="alta-apellido"
                    type="text"
                    value={formAlta.apellido}
                    onChange={e => setFormAlta(f => ({ ...f, apellido: e.target.value }))}
                    disabled={creandoCliente}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="alta-cuit">CUIT *</label>
                  <input
                    id="alta-cuit"
                    type="text"
                    inputMode="numeric"
                    value={formAlta.dni}
                    onChange={e => setFormAlta(f => ({ ...f, dni: e.target.value.replace(/\D/g, '') }))}
                    disabled={creandoCliente}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="alta-telefono">Teléfono *</label>
                  <input
                    id="alta-telefono"
                    type="text"
                    inputMode="numeric"
                    value={formAlta.telefono}
                    onChange={e => setFormAlta(f => ({ ...f, telefono: e.target.value }))}
                    disabled={creandoCliente}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="alta-email">Email (opcional)</label>
                  <input
                    id="alta-email"
                    type="email"
                    value={formAlta.email}
                    onChange={e => setFormAlta(f => ({ ...f, email: e.target.value }))}
                    disabled={creandoCliente}
                  />
                </div>
              </div>

              <div className="admin-form-actions">
                <button type="submit" className="btn btn-primary" disabled={creandoCliente}>
                  {creandoCliente ? 'Registrando...' : 'Registrar cliente'}
                </button>
              </div>
            </form>
          )}

          {clientesEncontrados.length > 1 && !clienteSeleccionado && (
            <div className="admin-table-wrapper" style={{ marginTop: '1rem' }}>
              <p>Se encontró más de un cliente con ese CUIT. Elegí a cuál cargarle los puntos:</p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Saldo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clientesEncontrados.map(c => (
                    <tr key={c.user_id}>
                      <td>{nombreCliente(c)}</td>
                      <td>{c.email ?? '—'}</td>
                      <td>{c.puntos_saldo} pts</td>
                      <td>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => seleccionarCliente(c)}>
                          Elegir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {clienteSeleccionado && (
            <form onSubmit={handleAcreditar} className="admin-form" style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <p style={{ marginTop: 0 }}>
                Cliente: <strong>{nombreCliente(clienteSeleccionado)}</strong>
                {clienteSeleccionado.email && ` (${clienteSeleccionado.email})`}
                {clienteSeleccionado.dni && ` — CUIT ${clienteSeleccionado.dni}`}
                {clienteSeleccionado.es_cliente_fisico && (
                  <span style={{ marginLeft: '0.5rem', color: 'var(--text-light)', fontSize: '0.8rem' }}>
                    (cliente físico — sin cuenta online)
                  </span>
                )}
                <br />
                Saldo actual: <strong>{clienteSeleccionado.puntos_saldo} pts</strong>
              </p>

              {mensajeExito && <div className="admin-success">{mensajeExito}</div>}
              {errorAcreditar && <div className="admin-error">{errorAcreditar}</div>}

              <div className="admin-form-grid">
                <div className="form-group">
                  <label htmlFor="puntos-cargar">Puntos a cargar *</label>
                  <input
                    id="puntos-cargar"
                    type="number"
                    min="1"
                    step="1"
                    value={puntosACargar}
                    onChange={e => setPuntosACargar(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="motivo-carga">Motivo (opcional)</label>
                  <input
                    id="motivo-carga"
                    type="text"
                    value={motivoCarga}
                    onChange={e => setMotivoCarga(e.target.value)}
                    placeholder="Ej: Compra en el local - Boleta #1234"
                  />
                </div>
              </div>

              <div className="admin-form-actions">
                <button type="submit" className="btn btn-primary" disabled={acreditando}>
                  {acreditando ? 'Acreditando...' : 'Acreditar puntos'}
                </button>
              </div>
            </form>
          )}
        </div>

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
