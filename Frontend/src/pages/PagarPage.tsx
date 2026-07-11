import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarritoContext } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { crearPedido } from '../api/pedidos.api';
import { iniciarCheckoutHosted } from '../api/pagos.api';
import { precioEfectivo, formatPrecio } from '../types';
import type { MetodoPago } from '../types';

const CBU_FARMACIA   = '0720066320000001483022';
const ALIAS_FARMACIA = 'farmacia.apotheka';
const BANCO_FARMACIA = 'Banco Santander';
const TITULAR        = 'APOTHEKA SRL';

export function PagarPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, totalPrecio, subtotalLista, vaciarCarrito } = useCarritoContext();
  const navigate = useNavigate();
  const {
    metodo, costoEnvio, sucursalSeleccionada, direccion, resetCheckout,
    destinatarioNombre, destinatarioDni, destinatarioCodArea, destinatarioTelefono,
  } = useCheckout();

  const [metodoPago,         setMetodoPago]         = useState<MetodoPago>('tarjeta');
  const [confirmando,        setConfirmando]         = useState(false);
  const [error,              setError]               = useState<string | null>(null);
  const [modalTransferencia, setModalTransferencia]  = useState(false);

  const hayAhorro  = subtotalLista > totalPrecio;
  const totalFinal = totalPrecio + costoEnvio;

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?next=pagar');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !user) return;
    if (!authLoading && items.length === 0) navigate('/');
  }, [authLoading, user, items, navigate]);

  // Si cambian al retiro en farmacia y tenían tarjeta seleccionada, no hay problema.
  // Si cambian a otro método de envío y tenían efectivo seleccionado, resetear.
  useEffect(() => {
    if (metodo !== 'retiro_farmacia' && metodoPago === 'efectivo') {
      setMetodoPago('tarjeta');
    }
  }, [metodo]);

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
      sucursal_correo_argentino: sucursalSeleccionada?.code,
      codigo_postal_envio: metodo === 'domicilio'
        ? (direccion?.codigo_postal ?? undefined)
        : (sucursalSeleccionada?.postalCode ?? undefined),
      metodo_pago: mp,
      destinatario_nombre:   metodo === 'domicilio' ? destinatarioNombre.trim() || undefined : undefined,
      destinatario_dni:      metodo === 'domicilio' ? destinatarioDni.trim() || undefined : undefined,
      destinatario_cod_area: metodo === 'domicilio' ? destinatarioCodArea.trim() || undefined : undefined,
      destinatario_telefono: metodo === 'domicilio' ? destinatarioTelefono.trim() || undefined : undefined,
    };
  }

  async function handleConfirmar() {
    setConfirmando(true);
    setError(null);
    try {
      if (metodoPago === 'tarjeta') {
        const pedido = await crearPedido(buildPedidoDTO('tarjeta'));
        const { checkoutUrl } = await iniciarCheckoutHosted(pedido.id);
        vaciarCarrito();
        resetCheckout();
        window.location.href = checkoutUrl;
      } else {
        const pedido = await crearPedido(buildPedidoDTO(metodoPago));
        vaciarCarrito();
        resetCheckout();
        navigate(`/pago/pendiente?pedido=${pedido.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar el pedido. Intentá de nuevo.');
      setConfirmando(false);
    }
  }

  if (!authLoading && !user) return null;

  return (
    <div className="checkout-page pagar-page">
      <h1 className="checkout-titulo">Forma de pago</h1>

      <div className="checkout-grid">
        {/* ── Columna izquierda: lista de métodos de pago ── */}
        <div className="checkout-izq">
          <section className="checkout-section">
            <h2 className="checkout-section__titulo">Elegí cómo querés pagar</h2>

            <div className="pago-metodo-lista">

              {/* ── Tarjeta ── */}
              <label className={`pago-metodo-item${metodoPago === 'tarjeta' ? ' pago-metodo-item--activo' : ''}`}>
                <input type="radio" name="metodoPago" value="tarjeta" checked={metodoPago === 'tarjeta'} onChange={() => setMetodoPago('tarjeta')} />
                <div className="pago-metodo-item__header">
                  <div className="pago-metodo-item__radio">
                    {metodoPago === 'tarjeta' && <div className="pago-metodo-item__dot" />}
                  </div>
                  <div className="pago-metodo-item__icono">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <div className="pago-metodo-item__info">
                    <span className="pago-metodo-item__nombre">Tarjeta de crédito / débito</span>
                    <span className="pago-metodo-item__desc">Pago seguro vía Payway</span>
                  </div>
                </div>
                {metodoPago === 'tarjeta' && (
                  <div className="pago-metodo-item__detalle">
                    <p>Serás redirigido a la plataforma segura de Payway para ingresar los datos de tu tarjeta.</p>
                  </div>
                )}
              </label>

              {/* ── Transferencia ── */}
              <label className={`pago-metodo-item${metodoPago === 'transferencia' ? ' pago-metodo-item--activo' : ''}`}>
                <input type="radio" name="metodoPago" value="transferencia" checked={metodoPago === 'transferencia'} onChange={() => setMetodoPago('transferencia')} />
                <div className="pago-metodo-item__header">
                  <div className="pago-metodo-item__radio">
                    {metodoPago === 'transferencia' && <div className="pago-metodo-item__dot" />}
                  </div>
                  <div className="pago-metodo-item__icono">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                      <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                  </div>
                  <div className="pago-metodo-item__info">
                    <span className="pago-metodo-item__nombre">Transferencia bancaria</span>
                  </div>
                </div>
                {metodoPago === 'transferencia' && (
                  <div className="pago-metodo-item__detalle">
                    <div className="pago-info__datos">
                      <div className="pago-info__fila"><span>Banco</span><strong>{BANCO_FARMACIA}</strong></div>
                      <div className="pago-info__fila"><span>Titular</span><strong>{TITULAR}</strong></div>
                      <div className="pago-info__fila"><span>CBU</span><strong>{CBU_FARMACIA}</strong></div>
                      <div className="pago-info__fila"><span>Alias</span><strong>{ALIAS_FARMACIA}</strong></div>
                    </div>
                    <button
                      type="button"
                      className="pago-info__btn-importante"
                      onClick={e => { e.preventDefault(); setModalTransferencia(true); }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      Info importante
                    </button>
                  </div>
                )}
              </label>

              {/* ── Efectivo (solo retiro en farmacia) ── */}
              {metodo === 'retiro_farmacia' && (
                <label className={`pago-metodo-item${metodoPago === 'efectivo' ? ' pago-metodo-item--activo' : ''}`}>
                  <input type="radio" name="metodoPago" value="efectivo" checked={metodoPago === 'efectivo'} onChange={() => setMetodoPago('efectivo')} />
                  <div className="pago-metodo-item__header">
                    <div className="pago-metodo-item__radio">
                      {metodoPago === 'efectivo' && <div className="pago-metodo-item__dot" />}
                    </div>
                    <div className="pago-metodo-item__icono">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
                      </svg>
                    </div>
                    <div className="pago-metodo-item__info">
                      <span className="pago-metodo-item__nombre">Efectivo</span>
                      <span className="pago-metodo-item__desc">Pagás al retirar en la farmacia</span>
                    </div>
                  </div>
                  {metodoPago === 'efectivo' && (
                    <div className="pago-metodo-item__detalle">
                      <p>Tené el monto exacto listo al momento de retirar tu pedido en nuestra farmacia.</p>
                    </div>
                  )}
                </label>
              )}
            </div>

            {error && <p className="checkout-error" style={{ marginTop: '0.75rem' }}>{error}</p>}
          </section>
        </div>

        {/* ── Columna derecha: resumen + confirmar ── */}
        <div className="checkout-der">
          <section className="checkout-section checkout-resumen">
            <h2 className="checkout-section__titulo">Resumen del pedido</h2>

            <ul className="checkout-items-lista">
              {items.map(i => (
                <li key={i.producto.id} className="checkout-item">
                  <img src={i.producto.imagen_url ?? '/placeholder.png'} alt={i.producto.nombre} className="checkout-item__img" width={48} height={48} loading="lazy" />
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

            <button
              className="btn btn--primary btn--full checkout-confirmar-btn"
              onClick={handleConfirmar}
              disabled={confirmando}
            >
              {confirmando
                ? (metodoPago === 'tarjeta' ? 'Redirigiendo a Payway...' : 'Registrando pedido...')
                : 'Confirmar compra →'}
            </button>
            <Link to="/envio" className="checkout-seguir-comprando">← Volver al envío</Link>
          </section>
        </div>
      </div>

      {/* ── Modal: Info importante transferencia ── */}
      {modalTransferencia && (
        <div className="modal-overlay" onClick={() => setModalTransferencia(false)}>
          <div className="modal-transferencia" onClick={e => e.stopPropagation()}>
            <button className="modal-transferencia__cerrar" onClick={() => setModalTransferencia(false)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="modal-transferencia__header">
              <div className="modal-transferencia__icono">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 12l2.5 2.5L16 9"/>
                </svg>
              </div>
              <p className="modal-transferencia__titulo">Es importante que tengas en cuenta:</p>
            </div>
            <div className="modal-transferencia__body">
              <p className="modal-transferencia__subtitulo">Transferencia Bancaria</p>
              <p>Una vez que confirmes tu compra te enviaremos los datos necesarios para realizar la transferencia.</p>
              <p>Para informar tu pago, respondé el correo de confirmación adjuntando el comprobante. Una vez acreditado, empezará a correr el plazo de entrega según la opción seleccionada.</p>
            </div>
            <button className="btn btn--primary modal-transferencia__ok" onClick={() => setModalTransferencia(false)}>
              Ok, entiendo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
