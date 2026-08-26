import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarritoContext } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { fetchDireccion } from '../api/direcciones.api';
import { fetchPerfil } from '../api/perfil.api';
import { cotizarEnvio } from '../api/envio.api';
import { CotizandoEnvioModal } from '../components/ui/CotizandoEnvioModal';
import { extraerDniDeCuit } from '../utils/validarDocumento';
import { formatPrecio } from '../types';
import type { Perfil, OpcionCotizacionEnvio } from '../types';

const COSTO_ENVIO_ANILLO = 5000;
const WHATSAPP_ENVIOS = '5493518354942';

// 'domicilio' cubre dos zonas con costo muy distinto: dentro del anillo lo
// reparte la propia farmacia a precio fijo; fuera del anillo se cotiza con
// Correo Argentino (ver Backend/src/services/micorreoCotizacion.service.ts).
// Ambas mandan metodo_envio: 'domicilio' al backend — la zona es un detalle
// solo del front.
type ZonaDomicilio = 'anillo' | 'fuera_anillo';

export function EnvioPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, totalPrecio } = useCarritoContext();
  const navigate = useNavigate();

  const {
    metodo, costoEnvio, diasEstimados, tipoServicioEnvio, direccion,
    destinatarioNombre, destinatarioDni, destinatarioCodArea, destinatarioTelefono,
    setMetodo, setCostoEnvio, setDiasEstimados, setTipoServicioEnvio, setSucursalSeleccionada, setDireccion,
    setDestinatarioNombre, setDestinatarioDni, setDestinatarioCodArea, setDestinatarioTelefono,
  } = useCheckout();

  const [error, setError] = useState<string | null>(null);
  const [opciones, setOpciones] = useState<OpcionCotizacionEnvio[]>([]);

  // Sub-paso sólo para domicilio
  const [subpaso,       setSubpaso]       = useState<'seleccion' | 'detalle_domicilio'>('seleccion');
  const [perfil,        setPerfil]        = useState<Perfil | null>(null);
  const [destiEsYo,     setDestiEsYo]     = useState(false);

  const [zonaDomicilio,    setZonaDomicilio]    = useState<ZonaDomicilio | null>(null);
  const [cotizando,        setCotizando]        = useState(false);
  const [cotizacionError,  setCotizacionError]  = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?next=envio');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    fetchDireccion().then(setDireccion).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (metodo !== 'domicilio') {
      setCostoEnvio(0);
      setDiasEstimados('');
      setTipoServicioEnvio(null);
      setOpciones([]);
      return;
    }

    if (zonaDomicilio === 'anillo') {
      setCostoEnvio(COSTO_ENVIO_ANILLO);
      setDiasEstimados('');
      setTipoServicioEnvio(null);
      setOpciones([]);
      return;
    }

    if (zonaDomicilio === 'fuera_anillo') {
      setCostoEnvio(0);
      setDiasEstimados('');
      setTipoServicioEnvio(null);
      setOpciones([]);
      if (!direccion?.codigo_postal || !direccion?.provincia_codigo) return;

      let cancelado = false;
      setCotizando(true);
      cotizarEnvio(items, direccion.codigo_postal, direccion.provincia_codigo, 'domicilio')
        .then(({ opciones: opcionesRecibidas }) => {
          if (cancelado) return;
          setOpciones(opcionesRecibidas);
          setCotizacionError(
            opcionesRecibidas.length === 0
              ? 'No hay opciones de envío disponibles para tu domicilio.'
              : null,
          );
        })
        .catch(() => {
          if (cancelado) return;
          setCotizacionError('No pudimos cotizar el envío a tu domicilio en este momento.');
        })
        .finally(() => { if (!cancelado) setCotizando(false); });
      return () => { cancelado = true; };
    }
  }, [metodo, zonaDomicilio, direccion, items]);

  function elegirOpcionEnvio(opcion: OpcionCotizacionEnvio) {
    setCostoEnvio(opcion.precio);
    setDiasEstimados(opcion.plazoEstimado);
    setTipoServicioEnvio(opcion.tipoServicio);
  }

  // Cargar perfil al entrar al detalle de domicilio para el auto-fill
  useEffect(() => {
    if (subpaso === 'detalle_domicilio' && !perfil) {
      fetchPerfil().then(setPerfil).catch(() => {});
    }
  }, [subpaso]);

  function elegirRetiroFarmacia() {
    setMetodo('retiro_farmacia');
    setZonaDomicilio(null);
    setSucursalSeleccionada(null);
    setCotizacionError(null);
    setError(null);
    setSubpaso('seleccion');
  }

  function elegirDomicilio(zona: ZonaDomicilio) {
    setMetodo('domicilio');
    setZonaDomicilio(zona);
    setSucursalSeleccionada(null);
    setCotizacionError(null);
    setError(null);
    setSubpaso('seleccion');
  }

  function handleEsYoToggle() {
    const nuevo = !destiEsYo;
    setDestiEsYo(nuevo);
    if (nuevo && perfil) {
      setDestinatarioNombre([perfil.nombre, perfil.apellido].filter(Boolean).join(' '));
      // Correo Argentino pide el DNI real del destinatario — si el perfil
      // guardó un CUIT (caso normal desde que "Mis datos" solo pide CUIT),
      // hay que extraer el DNI embebido en vez de mandar el CUIT tal cual
      // (pedidos.service.ts valida destinatario_dni específicamente como DNI).
      setDestinatarioDni(perfil.documento_tipo === 'CUIT' ? extraerDniDeCuit(perfil.dni ?? '') : perfil.dni ?? '');
      setDestinatarioCodArea('');
      setDestinatarioTelefono(perfil.telefono ?? '');
    } else {
      setDestinatarioNombre('');
      setDestinatarioDni('');
      setDestinatarioCodArea('');
      setDestinatarioTelefono('');
    }
  }

  function avanzarDesdeSeleccion() {
    navigate('/pagar');
  }

  const puedeVerDetalle =
    metodo === 'domicilio' && !!direccion && costoEnvio > 0;

  const puedeAvanzarSeleccion = metodo === 'retiro_farmacia';

  const puedeIrAlPago = destinatarioNombre.trim() !== '' && destinatarioDni.trim() !== '';

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
      {cotizando && <CotizandoEnvioModal />}

      <h1 className="checkout-titulo">Método de envío</h1>

      <div className="checkout-grid">
        {/* ── Columna izquierda ── */}
        <div className="checkout-izq">

          {subpaso === 'seleccion' ? (
            <section className="checkout-section">
              <h2 className="checkout-section__titulo">Elegí cómo recibir tu pedido</h2>

              <div className="metodo-envio-opciones">
                <label className={`metodo-envio-card${metodo === 'retiro_farmacia' ? ' metodo-envio-card--activo' : ''}`}>
                  <input type="radio" name="metodo" value="retiro_farmacia" checked={metodo === 'retiro_farmacia'} onChange={elegirRetiroFarmacia} />
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

                <label className={`metodo-envio-card${metodo === 'domicilio' && zonaDomicilio === 'anillo' ? ' metodo-envio-card--activo' : ''}`}>
                  <input type="radio" name="metodo" value="anillo" checked={metodo === 'domicilio' && zonaDomicilio === 'anillo'} onChange={() => elegirDomicilio('anillo')} />
                  <div className="metodo-envio-card__icono">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                  </div>
                  <div className="metodo-envio-card__info">
                    <span className="metodo-envio-card__nombre">Envío dentro del anillo de circunvalación</span>
                    <span className="metodo-envio-card__desc">Córdoba Capital · envío gestionado directamente por la farmacia</span>
                  </div>
                  <span className="metodo-envio-card__precio">${formatPrecio(COSTO_ENVIO_ANILLO)}</span>
                </label>

                <label className={`metodo-envio-card${metodo === 'domicilio' && zonaDomicilio === 'fuera_anillo' ? ' metodo-envio-card--activo' : ''}`}>
                  <input type="radio" name="metodo" value="fuera_anillo" checked={metodo === 'domicilio' && zonaDomicilio === 'fuera_anillo'} onChange={() => elegirDomicilio('fuera_anillo')} />
                  <div className="metodo-envio-card__icono">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div className="metodo-envio-card__info">
                    <span className="metodo-envio-card__nombre">Envío a domicilio (fuera del anillo)</span>
                    <span className="metodo-envio-card__desc">Resto de Córdoba y el país · cotizado con Correo Argentino</span>
                  </div>
                  {zonaDomicilio === 'fuera_anillo' && cotizando ? (
                    <span className="metodo-envio-card__precio">Cotizando…</span>
                  ) : zonaDomicilio === 'fuera_anillo' && cotizacionError ? (
                    <span className="metodo-envio-card__badge">No disponible</span>
                  ) : zonaDomicilio === 'fuera_anillo' && costoEnvio > 0 ? (
                    <span className="metodo-envio-card__precio">${formatPrecio(costoEnvio)}</span>
                  ) : zonaDomicilio === 'fuera_anillo' && opciones.length > 0 ? (
                    <span className="metodo-envio-card__badge">Elegí una opción</span>
                  ) : (
                    <span className="metodo-envio-card__precio">A cotizar</span>
                  )}
                </label>
              </div>

              {zonaDomicilio === 'fuera_anillo' && cotizacionError && (
                <p className="checkout-aviso">
                  {cotizacionError} Consultá directamente por{' '}
                  <a href={`https://wa.me/${WHATSAPP_ENVIOS}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp: 351 835-4942
                  </a>.
                </p>
              )}

              {/* Detalle inline sólo para domicilio (dirección) */}
              {metodo === 'domicilio' && (
                <div className="checkout-envio-detalle">
                  {direccion ? (
                    <div className="checkout-direccion-info">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span>{direccion.calle} {direccion.altura}, {direccion.ciudad}, {direccion.provincia}</span>
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
                  {direccion?.codigo_postal && !direccion?.provincia_codigo && (
                    <p className="checkout-aviso">Tu dirección no tiene provincia cargada. Agregala para cotizar el envío.</p>
                  )}

                  {zonaDomicilio === 'fuera_anillo' && opciones.length > 0 && (
                    <div className="envio-tarifas-opciones">
                      {opciones.map(opcion => (
                        <label
                          key={opcion.tipoServicio}
                          className={`envio-tarifa-card${tipoServicioEnvio === opcion.tipoServicio ? ' envio-tarifa-card--activo' : ''}`}
                        >
                          <input
                            type="radio"
                            name="tipoServicioEnvio"
                            checked={tipoServicioEnvio === opcion.tipoServicio}
                            onChange={() => elegirOpcionEnvio(opcion)}
                          />
                          <div className="envio-tarifa-card__info">
                            <span className="envio-tarifa-card__nombre">{opcion.nombre}</span>
                            <span className="envio-tarifa-card__plazo">{opcion.plazoEstimado}</span>
                          </div>
                          <span className="envio-tarifa-card__precio">${formatPrecio(opcion.precio)}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {puedeVerDetalle && (
                    <button
                      className="btn btn--primary btn--full"
                      style={{ marginTop: '0.75rem' }}
                      onClick={() => setSubpaso('detalle_domicilio')}
                    >
                      Confirmar domicilio →
                    </button>
                  )}
                </div>
              )}

              {error && <p className="checkout-error">{error}</p>}
            </section>
          ) : (
            /* ── Sub-paso: detalle domicilio ── */
            <section className="checkout-section">
              <div className="envio-sub-header">
                <h2>Envío a domicilio</h2>
                <p>Completá los datos de quien va a recibir tu compra:</p>
              </div>

              {/* Tarjeta de dirección */}
              {direccion && (
                <div className="envio-dir-card">
                  <div className="envio-dir-card__pin">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3" fill="white" stroke="#1a3a5c"/>
                    </svg>
                  </div>
                  <div className="envio-dir-card__info">
                    <span className="envio-dir-card__label">Domicilio:</span>
                    <span className="envio-dir-card__calle">{direccion.calle} {direccion.altura}</span>
                    <span className="envio-dir-card__localidad">
                      {direccion.codigo_postal ? `CP ${direccion.codigo_postal}. ` : ''}
                      {direccion.ciudad?.toUpperCase()}. {direccion.provincia}
                    </span>
                  </div>
                  <Link to="/direcciones" className="envio-dir-card__editar">Editar o elegir otro</Link>
                </div>
              )}

              {/* Info de entrega */}
              <div className="envio-delivery-card">
                <div className="envio-delivery-card__icono">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div className="envio-delivery-card__info">
                  <p className="envio-delivery-card__dias">
                    {zonaDomicilio === 'fuera_anillo'
                      ? `Envío por Correo Argentino${diasEstimados ? ` · ${diasEstimados}` : ''}`
                      : 'Envío gestionado directamente por la farmacia'}
                  </p>
                  <p className="envio-delivery-card__costo">
                    Costo de envío: <strong>${formatPrecio(costoEnvio)}</strong>
                  </p>
                </div>
              </div>

              {/* Formulario destinatario */}
              <div className="envio-destinatario">
                <div className="envio-destinatario__header">
                  <span>Datos de quien lo recibe:</span>
                  <label className="envio-yo-toggle">
                    <input
                      type="checkbox"
                      checked={destiEsYo}
                      onChange={handleEsYoToggle}
                    />
                    <span className="envio-yo-toggle__radio" />
                    ¡Lo recibiré yo mismo!
                  </label>
                </div>

                <div className="envio-destinatario__grid">
                  <input
                    className="input"
                    placeholder="Nombre y apellido*"
                    value={destinatarioNombre}
                    onChange={e => { setDestiEsYo(false); setDestinatarioNombre(e.target.value); }}
                  />
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder="DNI*"
                    value={destinatarioDni}
                    onChange={e => { setDestiEsYo(false); setDestinatarioDni(e.target.value); }}
                  />
                </div>

                <div className="envio-destinatario__tel">
                  <div>
                    <span className="envio-destinatario__hint">(Cod. área con 0)</span>
                    <input
                      className="input"
                      type="text"
                      inputMode="numeric"
                      placeholder="Código de área"
                      value={destinatarioCodArea}
                      onChange={e => setDestinatarioCodArea(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="envio-destinatario__hint">(Número con 15)</span>
                    <input
                      className="input"
                      type="text"
                      inputMode="numeric"
                      placeholder="Teléfono de contacto"
                      value={destinatarioTelefono}
                      onChange={e => setDestinatarioTelefono(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && <p className="checkout-error">{error}</p>}

              <div className="envio-nav">
                <button className="btn btn--ghost envio-nav__regresar" onClick={() => setSubpaso('seleccion')}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Regresar
                </button>
                <button
                  className="btn btn--primary envio-nav__continuar"
                  onClick={() => navigate('/pagar')}
                  disabled={!puedeIrAlPago}
                >
                  Continuar
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            </section>
          )}
        </div>

        {/* ── Columna derecha: resumen ── */}
        <div className="checkout-der">
          <section className="checkout-section checkout-resumen">
            <h2 className="checkout-section__titulo">Resumen</h2>
            <ul className="checkout-items-lista">
              {items.map(i => (
                <li key={i.producto.id} className="checkout-item">
                  <img src={i.producto.imagen_url ?? '/placeholder.png'} alt={i.producto.nombre} className="checkout-item__img" width={48} height={48} loading="lazy" />
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

            {subpaso === 'seleccion' && (
              <>
                {error && <p className="checkout-error">{error}</p>}
                {metodo !== 'domicilio' && (
                  <button
                    className="btn btn--primary btn--full checkout-confirmar-btn"
                    onClick={avanzarDesdeSeleccion}
                    disabled={!puedeAvanzarSeleccion}
                  >
                    Proceder a pagar →
                  </button>
                )}
                <Link to="/" className="checkout-seguir-comprando">← Seguir comprando</Link>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
