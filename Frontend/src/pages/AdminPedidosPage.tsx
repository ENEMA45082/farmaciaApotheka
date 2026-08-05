import { useState, useRef, useEffect } from 'react';
import { fetchPedidosAdmin, fetchPedidoAdminPorId, cambiarEstadoPedido, reintentarFactura } from '../api/pedidos.api';
import type { Pedido, PedidoDetalleAdmin } from '../types';
import { formatPrecio } from '../types';
import { ESTADOS_FINALES, puedeTransicionar } from '../utils/estadosPedido';
import { AdminLayout } from '../components/admin/AdminLayout';
import { CancelarPedidoModal } from '../components/admin/CancelarPedidoModal';

const ESTADOS_PEDIDO: { value: Pedido['estado']; label: string }[] = [
  { value: 'PendienteDePago',  label: 'Pendiente de pago' },
  { value: 'Confirmado',       label: 'Confirmado' },
  { value: 'EnPreparacion',    label: 'En preparación' },
  { value: 'Enviado',          label: 'Enviado' },
  { value: 'ListoParaRetirar', label: 'Listo para retirar' },
  { value: 'Entregado',        label: 'Entregado' },
  { value: 'Cancelado',        label: 'Cancelado' },
];

const ESTADO_COLORS: Record<Pedido['estado'], { bg: string; color: string }> = {
  PendienteDePago:  { bg: '#fef3c7', color: '#92400e' },
  Confirmado:       { bg: '#dbeafe', color: '#1e40af' },
  EnPreparacion:    { bg: '#ede9fe', color: '#5b21b6' },
  Enviado:          { bg: '#cffafe', color: '#155e75' },
  ListoParaRetirar: { bg: '#ccfbf1', color: '#115e59' },
  Entregado:        { bg: '#d1fae5', color: '#065f46' },
  Cancelado:        { bg: '#fee2e2', color: '#991b1b' },
};

function EstadoDropdown({
  estado,
  disabled,
  onChange,
}: {
  estado: Pedido['estado'];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const cfg    = ESTADO_COLORS[estado];
  const label  = ESTADOS_PEDIDO.find(e => e.value === estado)?.label ?? estado;
  const opciones = ESTADOS_PEDIDO.filter(e => e.value !== 'Cancelado' && puedeTransicionar(estado, e.value));

  if (opciones.length === 0) {
    return (
      <span className="estado-badge" style={{ background: cfg.bg, color: cfg.color }}>
        {label}
      </span>
    );
  }

  return (
    <div className="estado-dropdown" ref={ref}>
      <button
        className="estado-dropdown__trigger"
        style={{ background: cfg.bg, color: cfg.color }}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        type="button"
      >
        {label}
        <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor" style={{ opacity: 0.7, flexShrink: 0 }}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </button>
      {open && (
        <div className="estado-dropdown__menu">
          {opciones.map(e => {
            const ec = ESTADO_COLORS[e.value];
            return (
              <button
                key={e.value}
                className="estado-dropdown__option"
                style={{ background: ec.bg, color: ec.color }}
                onClick={() => { onChange(e.value); setOpen(false); }}
                type="button"
              >
                {e.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const METODO_ENVIO_LABEL: Record<string, string> = {
  retiro_farmacia: 'Retiro farmacia',
  domicilio:       'Domicilio',
  retiro_sucursal: 'Sucursal Andreani',
};

const METODO_PAGO_LABEL: Record<string, string> = {
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia',
  efectivo:      'Efectivo',
};

function formatFechaPedido(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AdminPedidosPage() {
  // — Pedidos (admin) —
  const [pedidosAdmin, setPedidosAdmin] = useState<Pedido[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [errorPedidos, setErrorPedidos] = useState<string | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null);

  const [pedidoDetalle, setPedidoDetalle] = useState<PedidoDetalleAdmin | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [pedidoACancelar, setPedidoACancelar] = useState<Pedido | null>(null);

  const [filtroPedidoAbierto,    setFiltroPedidoAbierto]    = useState(false);
  const [filtroPedidoBusqueda,   setFiltroPedidoBusqueda]   = useState('');
  const [filtroPedidoEstado,     setFiltroPedidoEstado]     = useState('');
  const [filtroPedidoEnvio,      setFiltroPedidoEnvio]      = useState('');
  const [filtroPedidoPago,       setFiltroPedidoPago]       = useState('');
  const [filtroPedidoFechaDesde, setFiltroPedidoFechaDesde] = useState('');
  const [filtroPedidoFechaHasta, setFiltroPedidoFechaHasta] = useState('');

  const FILTROS_PEDIDO_VACIOS = {
    busqueda: '', estado: '', envio: '', pago: '', fechaDesde: '', fechaHasta: '',
  };
  const [filtrosPedidoAplicados, setFiltrosPedidoAplicados] = useState(FILTROS_PEDIDO_VACIOS);
  const [paginaPedidos, setPaginaPedidos] = useState(1);
  const TAMANO_PAGINA_PEDIDOS = 20;

  function aplicarFiltrosPedidos() {
    setFiltrosPedidoAplicados({
      busqueda: filtroPedidoBusqueda,
      estado: filtroPedidoEstado,
      envio: filtroPedidoEnvio,
      pago: filtroPedidoPago,
      fechaDesde: filtroPedidoFechaDesde,
      fechaHasta: filtroPedidoFechaHasta,
    });
    setPaginaPedidos(1);
  }

  function limpiarFiltrosPedidos() {
    setFiltroPedidoBusqueda('');
    setFiltroPedidoEstado('');
    setFiltroPedidoEnvio('');
    setFiltroPedidoPago('');
    setFiltroPedidoFechaDesde('');
    setFiltroPedidoFechaHasta('');
    setFiltrosPedidoAplicados(FILTROS_PEDIDO_VACIOS);
    setPaginaPedidos(1);
  }

  const hayFiltrosPedidosActivos = !!(
    filtrosPedidoAplicados.busqueda || filtrosPedidoAplicados.estado || filtrosPedidoAplicados.envio ||
    filtrosPedidoAplicados.pago || filtrosPedidoAplicados.fechaDesde || filtrosPedidoAplicados.fechaHasta
  );

  useEffect(() => {
    setCargandoPedidos(true);
    setErrorPedidos(null);
    fetchPedidosAdmin()
      .then(setPedidosAdmin)
      .catch(() => setErrorPedidos('No se pudieron cargar los pedidos.'))
      .finally(() => setCargandoPedidos(false));
  }, []);

  async function handleCambiarEstado(pedidoId: string, nuevoEstado: string) {
    setCambiandoEstado(pedidoId);
    try {
      const actualizado = await cambiarEstadoPedido(pedidoId, nuevoEstado);
      setPedidosAdmin(prev => prev.map(p => p.id === pedidoId ? actualizado : p));
    } catch {
      alert('No se pudo cambiar el estado.');
    } finally {
      setCambiandoEstado(null);
    }
  }

  async function handleAbrirDetallePedido(pedidoId: string) {
    setCargandoDetalle(true);
    setErrorDetalle(null);
    setPedidoDetalle(null);
    try {
      const pedido = await fetchPedidoAdminPorId(pedidoId);
      setPedidoDetalle(pedido);
    } catch {
      setErrorDetalle('No se pudo cargar el detalle del pedido.');
    } finally {
      setCargandoDetalle(false);
    }
  }

  const [reintentandoFactura, setReintentandoFactura] = useState(false);

  async function handleReintentarFactura(pedidoId: string) {
    setReintentandoFactura(true);
    try {
      await reintentarFactura(pedidoId);
      const actualizado = await fetchPedidoAdminPorId(pedidoId);
      setPedidoDetalle(actualizado);
    } catch {
      alert('No se pudo reintentar la emisión de la factura.');
    } finally {
      setReintentandoFactura(false);
    }
  }

  function handleCerrarDetallePedido() {
    setPedidoDetalle(null);
    setErrorDetalle(null);
  }

  const pedidosFiltrados = pedidosAdmin.filter(p => {
    const f = filtrosPedidoAplicados;
    if (f.estado && p.estado !== f.estado) return false;
    if (f.envio  && p.metodo_envio !== f.envio) return false;
    if (f.pago   && p.metodo_pago  !== f.pago)  return false;
    if (f.busqueda) {
      const nro = String(p.nro_pedido).padStart(5, '0');
      if (!nro.includes(f.busqueda.trim())) return false;
    }
    if (f.fechaDesde) {
      if (new Date(p.fecha_pedido) < new Date(f.fechaDesde)) return false;
    }
    if (f.fechaHasta) {
      const hasta = new Date(f.fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      if (new Date(p.fecha_pedido) > hasta) return false;
    }
    return true;
  });

  const totalPaginasPedidos = Math.max(1, Math.ceil(pedidosFiltrados.length / TAMANO_PAGINA_PEDIDOS));
  const pedidosPagina = pedidosFiltrados.slice(
    (paginaPedidos - 1) * TAMANO_PAGINA_PEDIDOS,
    paginaPedidos * TAMANO_PAGINA_PEDIDOS
  );

  return (
    <AdminLayout>
      <div className="admin-section">
        <div className="admin-table-card">
          <div className="admin-filtros-header">
            <h2>Pedidos ({pedidosFiltrados.length})</h2>
            <button
              type="button"
              className={`admin-filtros-toggle${hayFiltrosPedidosActivos ? ' admin-filtros-toggle--activo' : ''}`}
              onClick={() => setFiltroPedidoAbierto(v => !v)}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filtros{hayFiltrosPedidosActivos ? ' ●' : ''}
              <span className={`admin-filtros-arrow${filtroPedidoAbierto ? ' admin-filtros-arrow--open' : ''}`}>▾</span>
            </button>
          </div>

          {filtroPedidoAbierto && (
            <div className="admin-filtros-panel">
              <div className="admin-filtros-grid">
                <div className="form-group">
                  <label>Nro. de pedido</label>
                  <input
                    type="text"
                    placeholder="Ej: 00042"
                    value={filtroPedidoBusqueda}
                    onChange={e => setFiltroPedidoBusqueda(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Estado</label>
                  <select value={filtroPedidoEstado} onChange={e => setFiltroPedidoEstado(e.target.value)}>
                    <option value="">Todos</option>
                    {ESTADOS_PEDIDO.map(e => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Tipo de envío</label>
                  <select value={filtroPedidoEnvio} onChange={e => setFiltroPedidoEnvio(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="retiro_farmacia">Retiro farmacia</option>
                    <option value="domicilio">Domicilio</option>
                    <option value="retiro_sucursal">Sucursal Andreani</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tipo de pago</label>
                  <select value={filtroPedidoPago} onChange={e => setFiltroPedidoPago(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha desde</label>
                  <input type="date" value={filtroPedidoFechaDesde} onChange={e => setFiltroPedidoFechaDesde(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Fecha hasta</label>
                  <input type="date" value={filtroPedidoFechaHasta} onChange={e => setFiltroPedidoFechaHasta(e.target.value)} />
                </div>
              </div>

              <div className="admin-filtros-actions">
                <button type="button" className="btn btn-primary" onClick={aplicarFiltrosPedidos}>
                  Filtrar
                </button>
                {hayFiltrosPedidosActivos && (
                  <button type="button" className="btn btn-secondary" onClick={limpiarFiltrosPedidos}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          )}

          {cargandoPedidos && <p className="admin-loading">Cargando pedidos...</p>}
          {errorPedidos && <div className="admin-error">{errorPedidos}</div>}

          {!cargandoPedidos && pedidosFiltrados.length === 0 && (
            <p className="admin-empty">No hay pedidos{hayFiltrosPedidosActivos ? ' que coincidan con los filtros' : ''}.</p>
          )}

          {pedidosFiltrados.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table admin-pedidos-tabla">
                <thead>
                  <tr>
                    <th># Pedido</th>
                    <th>Fecha</th>
                    <th>Envío</th>
                    <th>Pago</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosPagina.map(p => (
                    <tr key={p.id}>
                      <td>
                        <button
                          type="button"
                          className="admin-pedidos-nro admin-pedidos-nro--link"
                          onClick={() => handleAbrirDetallePedido(p.id)}
                        >
                          APO-{String(p.nro_pedido).padStart(5, '0')}
                        </button>
                      </td>
                      <td>{formatFechaPedido(p.fecha_pedido)}</td>
                      <td>{METODO_ENVIO_LABEL[p.metodo_envio] ?? p.metodo_envio}</td>
                      <td>{p.metodo_pago ? (METODO_PAGO_LABEL[p.metodo_pago] ?? p.metodo_pago) : '—'}</td>
                      <td>${formatPrecio(p.total)}</td>
                      <td>
                        <EstadoDropdown
                          estado={p.estado}
                          disabled={cambiandoEstado === p.id}
                          onChange={v => handleCambiarEstado(p.id, v)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pedidosFiltrados.length > 0 && (
            <div className="pagination">
              <button
                className="btn btn--ghost"
                onClick={() => setPaginaPedidos(p => p - 1)}
                disabled={paginaPedidos === 1}
              >
                ← Anterior
              </button>
              <span className="pagination__info">Página {paginaPedidos} de {totalPaginasPedidos}</span>
              <button
                className="btn btn--ghost"
                onClick={() => setPaginaPedidos(p => p + 1)}
                disabled={paginaPedidos >= totalPaginasPedidos}
              >
                Siguiente →
              </button>
            </div>
          )}

          {(cargandoDetalle || errorDetalle || pedidoDetalle) && (
            <div className="modal-overlay" onClick={handleCerrarDetallePedido}>
              <div className="modal-pedido-admin" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="modal-pedido-admin__cerrar"
                  onClick={handleCerrarDetallePedido}
                  aria-label="Cerrar"
                >
                  ✕
                </button>

                {cargandoDetalle && <p className="admin-loading">Cargando pedido...</p>}
                {errorDetalle && <div className="admin-error">{errorDetalle}</div>}

                {pedidoDetalle && (
                  <div className="pedido-detalle pedido-detalle--admin">
                    <div className="pedido-detalle__header">
                      <div>
                        <h1 className="pedido-detalle__nro">
                          Pedido #APO-{String(pedidoDetalle.nro_pedido).padStart(5, '0')}
                        </h1>
                        <p className="pedido-detalle__fecha">{formatFechaPedido(pedidoDetalle.fecha_pedido)}</p>
                      </div>
                      <span
                        className="estado-badge estado-badge--lg"
                        style={{ background: ESTADO_COLORS[pedidoDetalle.estado].bg, color: ESTADO_COLORS[pedidoDetalle.estado].color }}
                      >
                        {ESTADOS_PEDIDO.find(e => e.value === pedidoDetalle.estado)?.label ?? pedidoDetalle.estado}
                      </span>
                    </div>

                    <div className="pedido-detalle__envio-info">
                      <h3 className="pedido-detalle__seccion-titulo">Cliente</h3>
                      <div className="pedido-detalle__envio-row">
                        <span className="pedido-detalle__envio-label">Nombre</span>
                        <span className="pedido-detalle__envio-valor">
                          {[pedidoDetalle.cliente.nombre, pedidoDetalle.cliente.apellido].filter(Boolean).join(' ') || 'Sin nombre registrado'}
                        </span>
                      </div>
                      <div className="pedido-detalle__envio-row">
                        <span className="pedido-detalle__envio-label">Email</span>
                        <span className="pedido-detalle__envio-valor">{pedidoDetalle.cliente.email ?? '—'}</span>
                      </div>
                      {pedidoDetalle.cliente.telefono && (
                        <div className="pedido-detalle__envio-row">
                          <span className="pedido-detalle__envio-label">Teléfono</span>
                          <span className="pedido-detalle__envio-valor">{pedidoDetalle.cliente.telefono}</span>
                        </div>
                      )}
                      {pedidoDetalle.cliente.dni && (
                        <div className="pedido-detalle__envio-row">
                          <span className="pedido-detalle__envio-label">DNI</span>
                          <span className="pedido-detalle__envio-valor">{pedidoDetalle.cliente.dni}</span>
                        </div>
                      )}
                    </div>

                    <div className="pedido-detalle__envio-info">
                      <h3 className="pedido-detalle__seccion-titulo">Entrega</h3>
                      <div className="pedido-detalle__envio-row">
                        <span className="pedido-detalle__envio-label">Método de entrega</span>
                        <span className="pedido-detalle__envio-valor">
                          {pedidoDetalle.metodo_envio === 'retiro_farmacia' && 'Retiro en farmacia'}
                          {pedidoDetalle.metodo_envio === 'domicilio' && `Envío a domicilio${pedidoDetalle.codigo_postal_envio ? ` — CP ${pedidoDetalle.codigo_postal_envio}` : ''}`}
                          {pedidoDetalle.metodo_envio === 'retiro_sucursal' && `Retiro en sucursal de Correo Argentino${pedidoDetalle.sucursal_correo_argentino ? ` — ${pedidoDetalle.sucursal_correo_argentino}` : ''}`}
                        </span>
                      </div>
                      {pedidoDetalle.metodo_pago && (
                        <div className="pedido-detalle__envio-row">
                          <span className="pedido-detalle__envio-label">Método de pago</span>
                          <span className="pedido-detalle__envio-valor">
                            {METODO_PAGO_LABEL[pedidoDetalle.metodo_pago] ?? pedidoDetalle.metodo_pago}
                          </span>
                        </div>
                      )}
                      {pedidoDetalle.destinatario_nombre && (
                        <div className="pedido-detalle__envio-row">
                          <span className="pedido-detalle__envio-label">Destinatario</span>
                          <span className="pedido-detalle__envio-valor">
                            {pedidoDetalle.destinatario_nombre}
                            {pedidoDetalle.destinatario_dni ? ` · DNI ${pedidoDetalle.destinatario_dni}` : ''}
                            {pedidoDetalle.destinatario_telefono ? ` · Tel. ${pedidoDetalle.destinatario_cod_area ?? ''}${pedidoDetalle.destinatario_telefono}` : ''}
                          </span>
                        </div>
                      )}
                      {pedidoDetalle.metodo_envio === 'domicilio' && (
                        pedidoDetalle.direccion_envio ? (
                          <div className="pedido-detalle__envio-row pedido-detalle__envio-row--destacado">
                            <span className="pedido-detalle__envio-label">Dirección</span>
                            <span className="pedido-detalle__envio-valor">
                              {pedidoDetalle.direccion_envio.calle} {pedidoDetalle.direccion_envio.altura}
                              {pedidoDetalle.direccion_envio.piso ? `, piso ${pedidoDetalle.direccion_envio.piso}` : ''}
                              {pedidoDetalle.direccion_envio.depto ? ` dpto ${pedidoDetalle.direccion_envio.depto}` : ''}
                              {' — '}{pedidoDetalle.direccion_envio.ciudad}, {pedidoDetalle.direccion_envio.provincia}
                              {pedidoDetalle.direccion_envio.codigo_postal ? ` (CP ${pedidoDetalle.direccion_envio.codigo_postal})` : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="pedido-detalle__direccion-faltante">
                            ⚠ No hay una dirección guardada para este cliente. Contactalo antes de despachar el pedido.
                          </div>
                        )
                      )}
                      {pedidoDetalle.shipping_tracking_number && (
                        <div className="pedido-detalle__envio-row">
                          <span className="pedido-detalle__envio-label">Tracking</span>
                          <span className="pedido-detalle__envio-valor">{pedidoDetalle.shipping_tracking_number}</span>
                        </div>
                      )}
                    </div>

                    <table className="pedido-tabla">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Precio unit.</th>
                          <th>Cant.</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(pedidoDetalle.detalles ?? []).map(d => (
                          <tr key={d.id}>
                            <td>{d.nombre_producto}</td>
                            <td>
                              ${formatPrecio(d.precio_unitario)}
                              {d.precio_lista > d.precio_unitario && (
                                <span className="pedido-tabla__lista"> (lista: ${formatPrecio(d.precio_lista)})</span>
                              )}
                            </td>
                            <td>{d.cantidad}</td>
                            <td>${formatPrecio(d.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="pedido-detalle__totales">
                      {pedidoDetalle.subtotal_lista > pedidoDetalle.total && (
                        <>
                          <p>Precio de lista: <s>${formatPrecio(pedidoDetalle.subtotal_lista)}</s></p>
                          <p className="pedido-detalle__ahorro">Ahorro: ${formatPrecio(pedidoDetalle.subtotal_lista - pedidoDetalle.total)}</p>
                        </>
                      )}
                      {pedidoDetalle.costo_envio > 0 && (
                        <p>Envío: ${formatPrecio(pedidoDetalle.costo_envio)}</p>
                      )}
                      <p className="pedido-detalle__total">Total: <strong>${formatPrecio(pedidoDetalle.total)}</strong></p>
                      {pedidoDetalle.pw_payment_id && (
                        <p className="pedido-detalle__pago">
                          Pago procesado · ID: {pedidoDetalle.pw_payment_id}
                          {pedidoDetalle.pw_site_transaction_id && ` · Ref. Payway: ${pedidoDetalle.pw_site_transaction_id}`}
                        </p>
                      )}
                    </div>

                    <div className="pedido-detalle__factura">
                      <h3 className="pedido-detalle__seccion-titulo">Factura ARCA</h3>
                      {!pedidoDetalle.factura && (
                        <p className="pedido-detalle__pago">Sin factura (el pedido todavía no fue marcado como Entregado, o ARCA no está configurado).</p>
                      )}
                      {pedidoDetalle.factura?.estado === 'pendiente' && (
                        <p className="pedido-detalle__pago">Factura pendiente de emisión.</p>
                      )}
                      {pedidoDetalle.factura?.estado === 'emitida' && (
                        <p className="pedido-detalle__pago">
                          CAE: <strong>{pedidoDetalle.factura.cae}</strong>
                          {' '}(vence {pedidoDetalle.factura.cae_vencimiento}) — Comprobante {pedidoDetalle.factura.punto_venta}-{pedidoDetalle.factura.nro_comprobante}
                          {pedidoDetalle.factura.pdf_url ? (
                            <> — <a href={pedidoDetalle.factura.pdf_url} target="_blank" rel="noopener noreferrer">Ver / descargar PDF</a></>
                          ) : (
                            <> — <em>generando PDF…</em></>
                          )}
                        </p>
                      )}
                      {pedidoDetalle.factura?.estado === 'error' && (
                        <>
                          <p className="pedido-detalle__pago" style={{ color: '#c0392b' }}>
                            Error al emitir: {pedidoDetalle.factura.respuesta_error ?? 'error desconocido'}
                          </p>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            disabled={reintentandoFactura}
                            onClick={() => handleReintentarFactura(pedidoDetalle.id)}
                          >
                            {reintentandoFactura ? 'Reintentando…' : 'Reintentar factura'}
                          </button>
                        </>
                      )}
                    </div>

                    {!ESTADOS_FINALES.includes(pedidoDetalle.estado) && (
                      <div className="pedido-detalle__acciones-admin">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setPedidoACancelar(pedidoDetalle)}
                        >
                          Cancelar pedido
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {pedidoACancelar && (
            <CancelarPedidoModal
              pedido={pedidoACancelar}
              onClose={() => setPedidoACancelar(null)}
              onCancelado={actualizado => {
                setPedidoACancelar(null);
                setPedidosAdmin(prev => prev.map(p => p.id === actualizado.id ? actualizado : p));
                setPedidoDetalle(prev => prev && prev.id === actualizado.id ? { ...prev, ...actualizado } : prev);
              }}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
