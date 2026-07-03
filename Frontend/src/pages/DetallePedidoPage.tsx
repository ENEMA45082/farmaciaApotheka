import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchPedidoPorId, cancelarPedido } from '../api/pedidos.api';
import { PerfilLayout } from '../components/layout/PerfilLayout';
import { TrackingSection } from '../components/pedidos/TrackingSection';
import type { Pedido, MetodoEnvio } from '../types';
import { formatPrecio } from '../types';

const ESTADO_CONFIG: Record<Pedido['estado'], { label: string; clase: string }> = {
  pendiente:       { label: 'Pendiente',       clase: 'badge--pendiente' },
  confirmado:      { label: 'Confirmado',       clase: 'badge--confirmado' },
  en_preparacion:  { label: 'En preparación',  clase: 'badge--preparacion' },
  enviado:         { label: 'Enviado',          clase: 'badge--enviado' },
  entregado:       { label: 'Entregado',        clase: 'badge--entregado' },
  cancelado:       { label: 'Cancelado',        clase: 'badge--cancelado' },
  anulado:         { label: 'Anulado',          clase: 'badge--cancelado' },
};

const PASOS_ACTIVOS: Pedido['estado'][] = ['pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado'];

function labelPasoEnvio(metodo: MetodoEnvio) {
  return metodo === 'retiro_farmacia' ? 'Listo para retiro' : 'En camino';
}

function ProgresoStepper({ pedido }: { pedido: Pedido }) {
  const cancelado = pedido.estado === 'cancelado' || pedido.estado === 'anulado';
  const pasoActual = PASOS_ACTIVOS.indexOf(pedido.estado);

  const pasos = [
    { key: 'pendiente',      label: 'Pedido recibido' },
    { key: 'confirmado',     label: 'Pago confirmado' },
    { key: 'en_preparacion', label: 'En preparación' },
    { key: 'enviado',        label: labelPasoEnvio(pedido.metodo_envio) },
    { key: 'entregado',      label: 'Entregado' },
  ];

  if (cancelado) {
    return (
      <div className="pedido-progreso pedido-progreso--cancelado">
        <div className="pedido-progreso__cancelado-icono">✕</div>
        <p className="pedido-progreso__cancelado-label">
          {pedido.estado === 'anulado' ? 'Pedido anulado' : 'Pedido cancelado'}
        </p>
      </div>
    );
  }

  return (
    <div className="pedido-progreso">
      {pasos.map((paso, i) => {
        const hecho    = i <= pasoActual;
        const esCurrent = i === pasoActual;
        return (
          <div key={paso.key} className={`pedido-progreso__paso${hecho ? ' pedido-progreso__paso--hecho' : ''}${esCurrent ? ' pedido-progreso__paso--actual' : ''}`}>
            <div className="pedido-progreso__circulo">
              {hecho ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : <span>{i + 1}</span>}
            </div>
            {i < pasos.length - 1 && <div className={`pedido-progreso__linea${hecho ? ' pedido-progreso__linea--hecha' : ''}`} />}
            <span className="pedido-progreso__label">{paso.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function DetallePedidoPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    fetchPedidoPorId(id)
      .then(setPedido)
      .catch(() => setError('No se pudo cargar el pedido.'))
      .finally(() => setCargando(false));
  }, [user, id]);

  async function handleCancelar() {
    if (!id || !pedido) return;
    if (!confirm('¿Confirmás que querés cancelar este pedido?')) return;
    setCancelando(true);
    try {
      const actualizado = await cancelarPedido(id);
      setPedido(actualizado);
    } catch {
      setError('No se pudo cancelar el pedido.');
    } finally {
      setCancelando(false);
    }
  }

  if (!authLoading && !user) return null;
  if (authLoading || cargando) return <PerfilLayout><div className="perfil-loading">Cargando pedido...</div></PerfilLayout>;
  if (error) return <PerfilLayout><p className="pedido-error">{error}</p><Link to="/pedidos">← Mis Pedidos</Link></PerfilLayout>;
  if (!pedido) return null;

  const cfg = ESTADO_CONFIG[pedido.estado];

  return (
    <PerfilLayout>
      <Link to="/pedidos" className="pedido-back">← Mis Pedidos</Link>

      <div className="pedido-detalle">
        <div className="pedido-detalle__header">
          <div>
            <h1 className="pedido-detalle__nro">
              Pedido #APO-{String(pedido.nro_pedido).padStart(5, '0')}
            </h1>
            <p className="pedido-detalle__fecha">{formatFecha(pedido.fecha_pedido)}</p>
          </div>
          <span className={`estado-badge estado-badge--lg ${cfg.clase}`}>{cfg.label}</span>
        </div>

        <ProgresoStepper pedido={pedido} />

        <div className="pedido-detalle__envio-info">
          <div className="pedido-detalle__envio-row">
            <span className="pedido-detalle__envio-label">Método de entrega</span>
            <span className="pedido-detalle__envio-valor">
              {pedido.metodo_envio === 'retiro_farmacia' && 'Retiro en farmacia'}
              {pedido.metodo_envio === 'domicilio' && `Envío a domicilio${pedido.codigo_postal_envio ? ` — CP ${pedido.codigo_postal_envio}` : ''}`}
              {pedido.metodo_envio === 'retiro_sucursal' && `Retiro en sucursal de Correo Argentino${pedido.sucursal_correo_argentino ? ` — ${pedido.sucursal_correo_argentino}` : ''}`}
            </span>
          </div>
          {pedido.metodo_pago && (
            <div className="pedido-detalle__envio-row">
              <span className="pedido-detalle__envio-label">Método de pago</span>
              <span className="pedido-detalle__envio-valor">
                {pedido.metodo_pago === 'tarjeta'        && 'Tarjeta (Payway)'}
                {pedido.metodo_pago === 'transferencia'  && 'Transferencia bancaria'}
                {pedido.metodo_pago === 'efectivo'       && 'Efectivo en farmacia'}
              </span>
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
            {(pedido.detalles ?? []).map(d => (
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
          {pedido.subtotal_lista > pedido.total && (
            <>
              <p>Precio de lista: <s>${formatPrecio(pedido.subtotal_lista)}</s></p>
              <p className="pedido-detalle__ahorro">Ahorraste: ${formatPrecio(pedido.subtotal_lista - pedido.total)}</p>
            </>
          )}
          {pedido.costo_envio > 0 && (
            <p>Envío ({
              pedido.metodo_envio === 'domicilio' ? 'a domicilio' :
              pedido.metodo_envio === 'retiro_sucursal' ? `retiro en ${pedido.sucursal_correo_argentino ?? 'sucursal de Correo Argentino'}` :
              'retiro en farmacia'
            }): ${formatPrecio(pedido.costo_envio)}</p>
          )}
          {pedido.metodo_envio === 'retiro_farmacia' && (
            <p>Envío: <strong style={{ color: '#16a34a' }}>GRATIS — Retiro en farmacia</strong></p>
          )}
          <p className="pedido-detalle__total">Total: <strong>${formatPrecio(pedido.total)}</strong></p>
          {pedido.pw_payment_id && (
            <p className="pedido-detalle__pago">Pago procesado · ID: {pedido.pw_payment_id}</p>
          )}
        </div>

        {pedido.estado === 'pendiente' && (
          <div className="pedido-detalle__acciones">
            <button className="btn btn--ghost" onClick={handleCancelar} disabled={cancelando}>
              {cancelando ? 'Cancelando...' : 'Cancelar pedido'}
            </button>
          </div>
        )}

        {(pedido.estado === 'enviado' || pedido.estado === 'entregado') && pedido.shipping_tracking_number && (
          <TrackingSection pedidoId={pedido.id} />
        )}
      </div>
    </PerfilLayout>
  );
}
