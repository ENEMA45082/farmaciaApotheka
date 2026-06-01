import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarritoContext } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { fetchDireccion } from '../api/direcciones.api';
import { cotizarEnvio, fetchSucursales } from '../api/envio.api';
import { formatPrecio } from '../types';
import type { SucursalAndreani } from '../types';

export function EnvioPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, totalPrecio } = useCarritoContext();
  const navigate = useNavigate();

  const {
    metodo, costoEnvio, diasEstimados, sucursalSeleccionada, codigoPostal, direccion,
    setMetodo, setCostoEnvio, setDiasEstimados, setSucursalSeleccionada, setCodigoPostal, setDireccion,
  } = useCheckout();

  const [sucursales,   setSucursales]   = useState<SucursalAndreani[]>([]);
  const [cotizando,    setCotizando]    = useState(false);
  const [buscandoSuc,  setBuscandoSuc]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?next=envio');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchDireccion().then(setDireccion).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (metodo === 'domicilio' && direccion?.codigo_postal) {
      cotizarMetodo('domicilio', direccion.codigo_postal);
    } else if (metodo !== 'domicilio' && metodo !== 'retiro_sucursal') {
      setCostoEnvio(0);
      setDiasEstimados('');
    }
  }, [metodo, direccion]);

  async function cotizarMetodo(m: 'domicilio' | 'retiro_sucursal', cp: string) {
    setCotizando(true);
    try {
      const res = await cotizarEnvio(items, cp, m);
      setCostoEnvio(res.precio);
      setDiasEstimados(res.diasEstimados);
    } catch {
      setError('No se pudo calcular el costo de envío.');
    } finally {
      setCotizando(false);
    }
  }

  async function buscarSucursales() {
    if (!codigoPostal.trim()) return;
    setBuscandoSuc(true);
    setSucursales([]);
    setSucursalSeleccionada(null);
    setCostoEnvio(0);
    try {
      const lista = await fetchSucursales(codigoPostal.trim());
      setSucursales(lista);
    } catch {
      setError('No se pudieron cargar las sucursales.');
    } finally {
      setBuscandoSuc(false);
    }
  }

  async function seleccionarSucursal(suc: SucursalAndreani) {
    setSucursalSeleccionada(suc);
    await cotizarMetodo('retiro_sucursal', codigoPostal.trim());
  }

  function cambiarMetodo(m: typeof metodo) {
    setMetodo(m);
    setCostoEnvio(0);
    setDiasEstimados('');
    setSucursales([]);
    setSucursalSeleccionada(null);
    setError(null);
  }

  const puedeAvanzar =
    metodo === 'retiro_farmacia' ||
    (metodo === 'domicilio' && costoEnvio > 0) ||
    (metodo === 'retiro_sucursal' && sucursalSeleccionada !== null && costoEnvio > 0);

  const totalFinal = totalPrecio + costoEnvio;

  if (!authLoading && !user) return null;
  if (!authLoading && items.length === 0) {
    return (
      <div className="checkout-vacio">
        <p>Tu carrito está vacío.</p>
        <Link to="/" className="btn btn--primary">Ver productos</Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1 className="checkout-titulo">Método de envío</h1>

      <div className="checkout-grid">
        {/* ── Columna izquierda: método de envío ── */}
        <div className="checkout-izq">
          <section className="checkout-section">
            <h2 className="checkout-section__titulo">Elegí cómo recibir tu pedido</h2>

            <div className="metodo-envio-opciones">
              <label className={`metodo-envio-card${metodo === 'retiro_farmacia' ? ' metodo-envio-card--activo' : ''}`}>
                <input type="radio" name="metodo" value="retiro_farmacia" checked={metodo === 'retiro_farmacia'} onChange={() => cambiarMetodo('retiro_farmacia')} />
                <div className="metodo-envio-card__icono">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="metodo-envio-card__info">
                  <span className="metodo-envio-card__nombre">Retiro gratis en farmacia</span>
                  <span className="metodo-envio-card__desc">Retirá tu pedido en nuestra sucursal</span>
                </div>
                <span className="metodo-envio-card__precio metodo-envio-card__precio--gratis">GRATIS</span>
              </label>

              <label className={`metodo-envio-card${metodo === 'domicilio' ? ' metodo-envio-card--activo' : ''}`}>
                <input type="radio" name="metodo" value="domicilio" checked={metodo === 'domicilio'} onChange={() => cambiarMetodo('domicilio')} />
                <div className="metodo-envio-card__icono">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div className="metodo-envio-card__info">
                  <span className="metodo-envio-card__nombre">Envío a domicilio</span>
                  <span className="metodo-envio-card__desc">{cotizando ? 'Calculando...' : diasEstimados || 'Andreani · 72 a 96 horas hábiles'}</span>
                </div>
                <span className="metodo-envio-card__precio">{cotizando ? '...' : costoEnvio > 0 ? `$${formatPrecio(costoEnvio)}` : '—'}</span>
              </label>

              <label className={`metodo-envio-card${metodo === 'retiro_sucursal' ? ' metodo-envio-card--activo' : ''}`}>
                <input type="radio" name="metodo" value="retiro_sucursal" checked={metodo === 'retiro_sucursal'} onChange={() => cambiarMetodo('retiro_sucursal')} />
                <div className="metodo-envio-card__icono">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div className="metodo-envio-card__info">
                  <span className="metodo-envio-card__nombre">Retiro en sucursal Andreani</span>
                  <span className="metodo-envio-card__desc">{sucursalSeleccionada ? sucursalSeleccionada.nombre : 'Elegí una sucursal cercana'}</span>
                </div>
                <span className="metodo-envio-card__precio">{cotizando ? '...' : costoEnvio > 0 && metodo === 'retiro_sucursal' ? `$${formatPrecio(costoEnvio)}` : '—'}</span>
              </label>
            </div>

            {metodo === 'domicilio' && (
              <div className="checkout-envio-detalle">
                {direccion ? (
                  <div className="checkout-direccion-info">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{direccion.calle_numero}, {direccion.ciudad}, {direccion.provincia}</span>
                    <Link to="/direcciones" className="checkout-direccion-cambiar">Cambiar</Link>
                  </div>
                ) : (
                  <div className="checkout-sin-direccion">
                    <p>No tenés una dirección guardada.</p>
                    <Link to="/direcciones" className="btn btn--ghost btn--sm">Agregar dirección</Link>
                  </div>
                )}
                {!direccion?.codigo_postal && direccion && (
                  <p className="checkout-aviso">Tu dirección no tiene código postal. Agregalo para cotizar el envío.</p>
                )}
              </div>
            )}

            {metodo === 'retiro_sucursal' && (
              <div className="checkout-envio-detalle">
                <div className="checkout-cp-busqueda">
                  <input
                    type="text"
                    className="input"
                    placeholder="Código postal (ej: 1425)"
                    value={codigoPostal}
                    onChange={e => setCodigoPostal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && buscarSucursales()}
                    maxLength={8}
                  />
                  <button className="btn btn--primary btn--sm" onClick={buscarSucursales} disabled={buscandoSuc || !codigoPostal.trim()}>
                    {buscandoSuc ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
                {sucursales.length > 0 && (
                  <ul className="checkout-sucursales-lista">
                    {sucursales.map(suc => (
                      <li
                        key={suc.id}
                        className={`checkout-sucursal-item${sucursalSeleccionada?.id === suc.id ? ' checkout-sucursal-item--activo' : ''}`}
                        onClick={() => seleccionarSucursal(suc)}
                      >
                        <div className="checkout-sucursal-item__radio">
                          {sucursalSeleccionada?.id === suc.id && <span className="checkout-sucursal-item__dot" />}
                        </div>
                        <div>
                          <p className="checkout-sucursal-item__nombre">{suc.nombre}</p>
                          <p className="checkout-sucursal-item__dir">{suc.direccion} — {suc.ciudad}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ── Columna derecha: resumen ── */}
        <div className="checkout-der">
          <section className="checkout-section checkout-resumen">
            <h2 className="checkout-section__titulo">Resumen</h2>
            <ul className="checkout-items-lista">
              {items.map(i => (
                <li key={i.producto.id} className="checkout-item">
                  <img src={i.producto.imagen_url ?? '/placeholder.png'} alt={i.producto.nombre} className="checkout-item__img" />
                  <div className="checkout-item__info">
                    <span className="checkout-item__nombre">{i.producto.nombre}</span>
                    <span className="checkout-item__cant">x{i.cantidad}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="checkout-totales">
              <div className="checkout-totales__fila">
                <span>Subtotal productos</span>
                <span>${formatPrecio(totalPrecio)}</span>
              </div>
              <div className="checkout-totales__fila">
                <span>Costo de envío</span>
                <span>
                  {metodo === 'retiro_farmacia'
                    ? <strong className="checkout-totales__gratis">GRATIS</strong>
                    : costoEnvio > 0 ? `$${formatPrecio(costoEnvio)}` : '—'}
                </span>
              </div>
              <div className="checkout-totales__fila checkout-totales__fila--total">
                <span>Total estimado</span>
                <strong>${formatPrecio(totalFinal)}</strong>
              </div>
            </div>

            {error && <p className="checkout-error">{error}</p>}

            <button
              className="btn btn--primary btn--full checkout-confirmar-btn"
              onClick={() => navigate('/pagar')}
              disabled={!puedeAvanzar}
            >
              Proceder a pagar →
            </button>
            <Link to="/" className="checkout-seguir-comprando">← Seguir comprando</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
