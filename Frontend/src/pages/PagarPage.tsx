import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarritoContext } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { crearPedido } from '../api/pedidos.api';
import { iniciarCheckoutHosted } from '../api/pagos.api';
import { precioEfectivo, formatPrecio } from '../types';
import type { MetodoPago } from '../types';

const CBU_FARMACIA   = '0720015500000000012345';
const ALIAS_FARMACIA = 'FARMACIA.APOTHEKA';
const BANCO_FARMACIA = 'Banco Galicia';
const TITULAR        = 'Farmacia Apotheka SRL';

export function PagarPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, totalPrecio, subtotalLista } = useCarritoContext();
  const navigate = useNavigate();
  const { metodo, costoEnvio, sucursalSeleccionada, codigoPostal, direccion, resetCheckout } = useCheckout();

  const [metodoPago,  setMetodoPago]  = useState<MetodoPago>('tarjeta');
  const [confirmando, setConfirmando] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const hayAhorro  = subtotalLista > totalPrecio;
  const totalFinal = totalPrecio + costoEnvio;

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?next=pagar');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !user) return;
    if (!authLoading && items.length === 0) navigate('/');
  }, [authLoading, user, items, navigate]);

  function buildPedidoDTO(mp: MetodoPago) {
    return {
      items: items.map(i => ({
        producto_id:     i.producto.id,
        nombre_producto: i.producto.nombre,
        cantidad:        i.cantidad,
        precio_unitario: precioEfectivo(i.producto),
        precio_lista:    i.producto.precio,
      })),
      metodo_envio:        metodo,
      costo_envio:         costoEnvio,
      sucursal_andreani:   sucursalSeleccionada?.nombre,
      codigo_postal_envio: metodo === 'domicilio'
        ? (direccion?.codigo_postal ?? undefined)
        : codigoPostal.trim() || undefined,
      metodo_pago: mp,
    };
  }

  async function handlePagarTarjeta() {
    setConfirmando(true);
    setError(null);
    try {
      const pedido = await crearPedido(buildPedidoDTO('tarjeta'));
      const { checkoutUrl } = await iniciarCheckoutHosted(pedido.id);
      resetCheckout();
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago. Intentá de nuevo.');
      setConfirmando(false);
    }
  }

  async function handlePagarTransferencia() {
    setConfirmando(true);
    setError(null);
    try {
      const pedido = await crearPedido(buildPedidoDTO('transferencia'));
      resetCheckout();
      navigate(`/pago/pendiente?pedido=${pedido.id}`);
    } catch {
      setError('No se pudo registrar el pedido. Intentá de nuevo.');
      setConfirmando(false);
    }
  }

  async function handlePagarEfectivo() {
    setConfirmando(true);
    setError(null);
    try {
      const pedido = await crearPedido(buildPedidoDTO('efectivo'));
      resetCheckout();
      navigate(`/pago/pendiente?pedido=${pedido.id}`);
    } catch {
      setError('No se pudo registrar el pedido. Intentá de nuevo.');
      setConfirmando(false);
    }
  }

  if (!authLoading && !user) return null;

  return (
    <div className="checkout-page pagar-page">
      <h1 className="checkout-titulo">Forma de pago</h1>

      <div className="checkout-grid">
        {/* ── Columna izquierda: métodos de pago ── */}
        <div className="checkout-izq">
          <section className="checkout-section">

            <div className="metodo-pago-tabs">
              <button
                className={`metodo-pago-tab${metodoPago === 'tarjeta' ? ' metodo-pago-tab--activo' : ''}`}
                onClick={() => setMetodoPago('tarjeta')}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Tarjeta
              </button>
              <button
                className={`metodo-pago-tab${metodoPago === 'transferencia' ? ' metodo-pago-tab--activo' : ''}`}
                onClick={() => setMetodoPago('transferencia')}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
                Transferencia
              </button>
              {metodo === 'retiro_farmacia' && (
                <button
                  className={`metodo-pago-tab${metodoPago === 'efectivo' ? ' metodo-pago-tab--activo' : ''}`}
                  onClick={() => setMetodoPago('efectivo')}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
                  </svg>
                  Efectivo
                </button>
              )}
            </div>

            {/* ── Panel Tarjeta ── */}
            {metodoPago === 'tarjeta' && (
              <div className="checkout-tarjeta">
                <p className="checkout-pago-info">
                  Serás redirigido a la plataforma segura de Payway para ingresar los datos de tu tarjeta.
                </p>

                {error && <p className="checkout-error">{error}</p>}

                <button
                  className="btn btn--primary btn--full checkout-confirmar-btn"
                  onClick={handlePagarTarjeta}
                  disabled={confirmando}
                >
                  {confirmando ? 'Redirigiendo a Payway...' : 'Confirmar y Pagar →'}
                </button>
              </div>
            )}

            {/* ── Panel Transferencia ── */}
            {metodoPago === 'transferencia' && (
              <div className="pago-transferencia-info">
                <p className="pago-info__titulo">Realizá la transferencia y luego confirmá tu pedido</p>
                <div className="pago-info__datos">
                  <div className="pago-info__fila"><span>Banco</span><strong>{BANCO_FARMACIA}</strong></div>
                  <div className="pago-info__fila"><span>Titular</span><strong>{TITULAR}</strong></div>
                  <div className="pago-info__fila"><span>CBU</span><strong>{CBU_FARMACIA}</strong></div>
                  <div className="pago-info__fila"><span>Alias</span><strong>{ALIAS_FARMACIA}</strong></div>
                  <div className="pago-info__fila pago-info__fila--monto"><span>Monto</span><strong>${formatPrecio(totalFinal)}</strong></div>
                </div>
                <p className="pago-info__aviso">Una vez recibida la transferencia, confirmaremos tu pedido y procederemos con la preparación.</p>

                {error && <p className="checkout-error">{error}</p>}

                <button className="btn btn--primary btn--full checkout-confirmar-btn" onClick={handlePagarTransferencia} disabled={confirmando}>
                  {confirmando ? 'Registrando pedido...' : 'Confirmar pedido por transferencia →'}
                </button>
              </div>
            )}

            {/* ── Panel Efectivo ── */}
            {metodoPago === 'efectivo' && (
              <div className="pago-efectivo-info">
                <p className="pago-info__titulo">Pagás en efectivo al retirar tu pedido</p>
                <div className="pago-info__datos">
                  <div className="pago-info__fila"><span>Dónde</span><strong>Nuestra sucursal</strong></div>
                  <div className="pago-info__fila pago-info__fila--monto"><span>Total a pagar</span><strong>${formatPrecio(totalFinal)}</strong></div>
                </div>
                <p className="pago-info__aviso">Tu pedido quedará reservado. Tené el efectivo listo al momento de retirarlo.</p>

                {error && <p className="checkout-error">{error}</p>}

                <button className="btn btn--primary btn--full checkout-confirmar-btn" onClick={handlePagarEfectivo} disabled={confirmando}>
                  {confirmando ? 'Registrando pedido...' : 'Confirmar pedido →'}
                </button>
              </div>
            )}

            <Link to="/envio" className="checkout-seguir-comprando">← Volver al envío</Link>
          </section>
        </div>

        {/* ── Columna derecha: resumen del pedido ── */}
        <div className="checkout-der">
          <section className="checkout-section checkout-resumen">
            <h2 className="checkout-section__titulo">Resumen del pedido</h2>

            <ul className="checkout-items-lista">
              {items.map(i => (
                <li key={i.producto.id} className="checkout-item">
                  <img src={i.producto.imagen_url ?? '/placeholder.png'} alt={i.producto.nombre} className="checkout-item__img" />
                  <div className="checkout-item__info">
                    <span className="checkout-item__nombre">{i.producto.nombre}</span>
                    <span className="checkout-item__cant">x{i.cantidad}</span>
                  </div>
                  <span className="checkout-item__subtotal">${formatPrecio(precioEfectivo(i.producto) * i.cantidad)}</span>
                </li>
              ))}
            </ul>

            <div className="checkout-totales">
              {hayAhorro && (
                <>
                  <div className="checkout-totales__fila">
                    <span>Precio de lista</span>
                    <s>${formatPrecio(subtotalLista)}</s>
                  </div>
                  <div className="checkout-totales__fila checkout-totales__fila--ahorro">
                    <span>Ahorrás</span>
                    <span>${formatPrecio(subtotalLista - totalPrecio)}</span>
                  </div>
                </>
              )}
              <div className="checkout-totales__fila">
                <span>Subtotal productos</span>
                <span>${formatPrecio(totalPrecio)}</span>
              </div>
              <div className="checkout-totales__fila">
                <span>Envío ({metodo === 'retiro_farmacia' ? 'retiro en farmacia' : metodo === 'domicilio' ? 'a domicilio' : 'retiro en sucursal'})</span>
                <span>{metodo === 'retiro_farmacia' ? <strong className="checkout-totales__gratis">GRATIS</strong> : `$${formatPrecio(costoEnvio)}`}</span>
              </div>
              <div className="checkout-totales__fila checkout-totales__fila--total">
                <span>Total</span>
                <strong>${formatPrecio(totalFinal)}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
