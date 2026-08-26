import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchPedidoPorId, cancelarPedido } from '../api/pedidos.api';
import { PerfilLayout } from '../components/layout/PerfilLayout';
import { TrackingSection } from '../components/pedidos/TrackingSection';
import type { Pedido, MetodoEnvio } from '../types';
import { formatPrecio } from '../types';

const ESTADO_CONFIG: Record<Pedido['estado'], { label: string; clase: string }> = {
  PendienteDePago:  { label: 'Pendiente de pago', clase: 'badge--pendiente' },
  Confirmado:       { label: 'Confirmado',        clase: 'badge--confirmado' },
  EnPreparacion:    { label: 'En preparación',    clase: 'badge--preparacion' },
  Enviado:          { label: 'Enviado',           clase: 'badge--enviado' },
  ListoParaRetirar: { label: 'Listo para retirar', clase: 'badge--listo-retirar' },
  Entregado:        { label: 'Entregado',         clase: 'badge--entregado' },
  Cancelado:        { label: 'Cancelado',         clase: 'badge--cancelado' },
};

function labelPasoEnvio(metodo: MetodoEnvio) {
  return metodo === 'retiro_farmacia' ? 'Listo para retiro' : 'En camino';
}

function ProgresoStepper({ pedido }: { pedido: Pedido }) {
  const cancelado = pedido.estado === 'Cancelado';
  const pasoEnvioKey = pedido.metodo_envio === 'retiro_farmacia' ? 'ListoParaRetirar' : 'Enviado';

  const pasos: { key: Pedido['estado']; label: string }[] = [
    { key: 'PendienteDePago', label: 'Pedido recibido' },
    { key: 'Confirmado',      label: 'Pago confirmado' },
    { key: 'EnPreparacion',   label: 'En preparación' },
    { key: pasoEnvioKey,      label: labelPasoEnvio(pedido.metodo_envio) },
    { key: 'Entregado',       label: 'Entregado' },
  ];
  const pasoActual = pasos.findIndex(p => p.key === pedido.estado);

  if (cancelado) {
    return (
      <div className="pedido-progreso pedido-progreso--cancelado">
        <div className="pedido-progreso__cancelado-icono">✕</div>
        <p className="pedido-progreso__cancelado-label">Pedido cancelado</p>
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
                <td>
                  ${formatPrecio(d.subtotal)}
                  {d.descuento > 0 && (
                    <span className="pedido-tabla__descuento-2x1"> (2x1: -${formatPrecio(d.descuento)})</span>
                  )}
                </td>
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
          {pedido.cupon_id && pedido.descuento_cupon > 0 && (
            <p className="pedido-detalle__ahorro">
              Cupón aplicado{pedido.cupon_codigo && ` (${pedido.cupon_codigo})`}: -${formatPrecio(pedido.descuento_cupon)}
            </p>
          )}
          {pedido.cuotas > 1 && (
            <p>Cuotas: {pedido.cuotas}x (recargo ${formatPrecio(pedido.recargo_financiero)})</p>
          )}
          <p className="pedido-detalle__total">Total: <strong>${formatPrecio(pedido.total)}</strong></p>
          {pedido.pw_payment_id && pedido.estado !== 'PendienteDePago' && pedido.estado !== 'Cancelado' && (
            <p className="pedido-detalle__pago">
              Pago procesado · ID: {pedido.pw_payment_id}
              {pedido.pw_site_transaction_id && ` · Ref. Payway: ${pedido.pw_site_transaction_id}`}
            </p>
          )}
          {pedido.puntos_ganados > 0 && (
            <p className="pedido-detalle__puntos-ganados">Ganaste {pedido.puntos_ganados} puntos con esta compra</p>
          )}
        </div>

        {pedido.estado === 'PendienteDePago' && (
          <div className="pedido-detalle__acciones">
            <button className="btn btn--ghost" onClick={handleCancelar} disabled={cancelando}>
              {cancelando ? 'Cancelando...' : 'Cancelar pedido'}
            </button>
          </div>
        )}

        {(pedido.estado === 'Enviado' || pedido.estado === 'Entregado') && pedido.shipping_tracking_number && (
          <TrackingSection pedidoId={pedido.id} />
        )}
      </div>
    </PerfilLayout>
  );
}
