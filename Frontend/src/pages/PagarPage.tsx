import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarritoContext } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { crearPedido } from '../api/pedidos.api';
import { procesarPago, iniciarCheckoutHosted } from '../api/pagos.api';
import { precioEfectivo, formatPrecio } from '../types';
import type { MetodoPago } from '../types';

const CBU_FARMACIA   = '0720015500000000012345';
const ALIAS_FARMACIA = 'FARMACIA.APOTHEKA';
const BANCO_FARMACIA = 'Banco Galicia';
const TITULAR        = 'Farmacia Apotheka SRL';

const ES_PRODUCCION = import.meta.env.VITE_PAYWAY_ENVIRONMENT === 'production';

const PAYWAY_URL = ES_PRODUCCION
  ? 'https://live.decidir.com/api/v2'
  : 'https://developers.decidir.com/api/v2';

const CARD_TYPES = [
  { id: 1,  label: 'Visa' },
  { id: 15, label: 'Mastercard' },
  { id: 31, label: 'American Express' },
  { id: 8,  label: 'Diners' },
  { id: 20, label: 'Mastercard Débito' },
  { id: 42, label: 'Visa Débito' },
];

const CUOTAS = [1, 3, 6, 12];

export function PagarPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, totalPrecio, subtotalLista } = useCarritoContext();
  const navigate = useNavigate();
  const { metodo, costoEnvio, sucursalSeleccionada, codigoPostal, direccion, resetCheckout } = useCheckout();

  const [metodoPago,  setMetodoPago]  = useState<MetodoPago>('tarjeta');
  const [confirmando, setConfirmando] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const formRef      = useRef<HTMLFormElement>(null);
  const [cardNumber, setCardNumber]   = useState('');
  const [cuotas,     setCuotas]       = useState(1);
  const [tipoTarjeta, setTipoTarjeta] = useState(1);

  const hayAhorro   = subtotalLista > totalPrecio;
  const totalFinal  = totalPrecio + costoEnvio;

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?next=pagar');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !user) return;
    if (!authLoading && items.length === 0) navigate('/');
  }, [authLoading, user, items, navigate]);

  async function tokenizarTarjeta(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Decidir = (window as any).Decidir;
    if (!Decidir) throw new Error('SDK de pagos no disponible. Recargá la página.');
    const decidir = new Decidir(PAYWAY_URL);
    decidir.setPublishableKey(import.meta.env.VITE_PAYWAY_PUBLIC_KEY ?? '');
    decidir.setTimeout(10000);
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decidir.createToken(formRef.current!, (status: number, response: any) => {
        console.log('[Payway] status:', status, 'response:', response);
        if (status === 200 || status === 201) {
          const token = response?.token ?? response?.id ?? '';
          if (!token) { reject(new Error('No se recibió token de pago.')); return; }
          resolve(token);
        } else {
          const msgs = Array.isArray(response?.error)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? response.error.map((e: any) => e.error?.message ?? e.param).join(', ')
            : typeof response === 'string' ? response : 'Datos de tarjeta inválidos';
          reject(new Error(msgs));
        }
      });
    });
  }

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
      metodo_pago:         mp,
    };
  }

  async function handlePagarTarjeta() {
    setConfirmando(true);
    setError(null);
    try {
      const pedido = await crearPedido(buildPedidoDTO('tarjeta'));

      if (ES_PRODUCCION) {
        // Producción: Hosted Checkout → redirige al formulario de Payway
        const { checkoutUrl } = await iniciarCheckoutHosted(pedido.id);
        resetCheckout();
        window.location.href = checkoutUrl;
      } else {
        // Sandbox: tokenización embebida (pago directo vía SDK)
        const token  = await tokenizarTarjeta();
        const cardEl = formRef.current?.querySelector('[data-decidir="card_number"]') as HTMLInputElement | null;
        const bin    = (cardEl?.value ?? '').replace(/\D/g, '').substring(0, 6);
        if (!bin || bin.length < 6) throw new Error('Ingresá el número de tarjeta completo.');

        const result = await procesarPago({ pedidoId: pedido.id, token, bin, cuotas, paymentMethodId: tipoTarjeta });
        resetCheckout();
        if (result.success) navigate(`/pago/exitoso?pedido=${pedido.id}`);
        else navigate(`/pago/fallido?pedido=${pedido.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar el pago. Intentá de nuevo.');
    } finally {
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
    } finally {
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
    } finally {
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

            {/* Tabs de método de pago */}
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
              <form ref={formRef} id="payway-form" className="checkout-tarjeta" onSubmit={e => e.preventDefault()}>
                <div className="checkout-tarjeta__fila checkout-tarjeta__fila--2col">
                  <div className="checkout-tarjeta__campo">
                    <label className="checkout-tarjeta__label">Tipo de tarjeta</label>
                    <select className="input" value={tipoTarjeta} onChange={e => setTipoTarjeta(Number(e.target.value))}>
                      {CARD_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="checkout-tarjeta__campo">
                    <label className="checkout-tarjeta__label">Cuotas</label>
                    <select className="input" value={cuotas} onChange={e => setCuotas(Number(e.target.value))}>
                      {CUOTAS.map(c => <option key={c} value={c}>{c === 1 ? 'Sin cuotas' : `${c} cuotas`}</option>)}
                    </select>
                  </div>
                </div>
                <div className="checkout-tarjeta__campo">
                  <label className="checkout-tarjeta__label">Número de tarjeta</label>
                  <input data-decidir="card_number" className="input" placeholder="XXXX XXXX XXXX XXXX" maxLength={19} value={cardNumber} onChange={e => setCardNumber(e.target.value)} />
                </div>
                <div className="checkout-tarjeta__fila checkout-tarjeta__fila--3col">
                  <div className="checkout-tarjeta__campo">
                    <label className="checkout-tarjeta__label">Mes venc.</label>
                    <input data-decidir="card_expiration_month" className="input" placeholder="MM" maxLength={2} />
                  </div>
                  <div className="checkout-tarjeta__campo">
                    <label className="checkout-tarjeta__label">Año venc.</label>
                    <input data-decidir="card_expiration_year" className="input" placeholder="AA" maxLength={2} />
                  </div>
                  <div className="checkout-tarjeta__campo">
                    <label className="checkout-tarjeta__label">CVV</label>
                    <input data-decidir="security_code" className="input" placeholder="XXX" maxLength={4} />
                  </div>
                </div>
                <div className="checkout-tarjeta__campo">
                  <label className="checkout-tarjeta__label">Titular (como figura en la tarjeta)</label>
                  <input data-decidir="card_holder_name" className="input" placeholder="NOMBRE APELLIDO" />
                </div>
                <div className="checkout-tarjeta__fila checkout-tarjeta__fila--2col">
                  <div className="checkout-tarjeta__campo">
                    <label className="checkout-tarjeta__label">Tipo de documento</label>
                    <select data-decidir="card_holder_doc_type" className="input">
                      <option value="dni">DNI</option>
                      <option value="cuil">CUIL</option>
                    </select>
                  </div>
                  <div className="checkout-tarjeta__campo">
                    <label className="checkout-tarjeta__label">Número de documento</label>
                    <input data-decidir="card_holder_doc_number" className="input" placeholder="12345678" maxLength={11} />
                  </div>
                </div>

                {error && <p className="checkout-error">{error}</p>}

                <button className="btn btn--primary btn--full checkout-confirmar-btn" onClick={handlePagarTarjeta} disabled={confirmando} type="button">
                  {confirmando ? 'Procesando pago...' : 'Confirmar y Pagar →'}
                </button>
              </form>
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
