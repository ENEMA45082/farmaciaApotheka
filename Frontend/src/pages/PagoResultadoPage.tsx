import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useCarritoContext } from '../context/CartContext';
import { fetchPedidoPorId, cancelarPedido } from '../api/pedidos.api';
import { formatPrecio } from '../types';
import type { Pedido } from '../types';

const CBU_FARMACIA   = '0720015500000000012345';
const ALIAS_FARMACIA = 'FARMACIA.APOTHEKA';
const BANCO_FARMACIA = 'Banco Galicia';
const TITULAR        = 'Farmacia Apotheka SRL';

export function PagoResultadoPage() {
  const { resultado } = useParams<{ resultado: string }>();
  const [params] = useSearchParams();
  const pedidoId = params.get('pedido');
  const { vaciarCarrito } = useCarritoContext();
  const [pedido,   setPedido]   = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (resultado === 'exitoso') vaciarCarrito();
  }, [resultado]);

  useEffect(() => {
    // Si el usuario canceló en Payway, cancelamos el pedido en el backend.
    // Si el webhook de Payway llegó primero, el pedido ya está cancelado y el
    // endpoint devuelve 400 — lo ignoramos silenciosamente.
    if (resultado === 'cancelado' && pedidoId) {
      cancelarPedido(pedidoId).catch(() => {});
    }
  }, [resultado, pedidoId]);

  useEffect(() => {
    if (resultado === 'pendiente' && pedidoId) {
      setCargando(true);
      fetchPedidoPorId(pedidoId)
        .then(setPedido)
        .catch(() => {})
        .finally(() => setCargando(false));
    }
  }, [resultado, pedidoId]);

  /* ── Exitoso ── */
  if (resultado === 'exitoso') {
    return (
      <div className="pago-resultado pago-resultado--exitoso">
        <div className="pago-resultado__icono">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </div>
        <h1 className="pago-resultado__titulo">¡Pago aprobado!</h1>
        <p className="pago-resultado__desc">Tu pedido fue confirmado y está siendo procesado.</p>
        {pedidoId && (
          <Link to={`/pedidos/${pedidoId}`} className="btn btn--primary pago-resultado__btn">
            Ver mi pedido
          </Link>
        )}
        <Link to="/" className="pago-resultado__link">Seguir comprando</Link>
      </div>
    );
  }

  /* ── Pendiente ── */
  if (resultado === 'pendiente') {
    if (cargando) {
      return (
        <div className="pago-resultado">
          <p className="pago-resultado__desc">Cargando resumen del pedido...</p>
        </div>
      );
    }

    const mp            = pedido?.metodo_pago;
    const nroPedido     = pedido?.nro_pedido;
    const detalles      = pedido?.detalles ?? [];
    const totalFinal    = (pedido?.total ?? 0);
    const costoEnvio    = pedido?.costo_envio ?? 0;
    const subtotal      = totalFinal - costoEnvio;
    const metodoEnvio   = pedido?.metodo_envio;

    return (
      <div className="pedido-receipt">

        {/* Encabezado */}
        <div className="pedido-receipt__header">
          <div className="pedido-receipt__check">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <h1 className="pedido-receipt__titulo">¡Pedido registrado!</h1>
            {nroPedido && <p className="pedido-receipt__nro">PEDIDO N° {nroPedido}</p>}
          </div>
        </div>

        {/* Datos bancarios (solo transferencia) */}
        {mp === 'transferencia' && (
          <div className="pedido-receipt__datos-banco">
            <p className="pedido-receipt__datos-banco-titulo">Datos para realizar la Transferencia Bancaria:</p>
            <div className="pedido-receipt__datos-banco-lista">
              <div className="pago-info__fila"><span>Entidad</span><strong>{BANCO_FARMACIA}</strong></div>
              <div className="pago-info__fila"><span>Titular</span><strong>{TITULAR}</strong></div>
              <div className="pago-info__fila"><span>CBU</span><strong>{CBU_FARMACIA}</strong></div>
              <div className="pago-info__fila"><span>Alias</span><strong>{ALIAS_FARMACIA}</strong></div>
              <div className="pago-info__fila pago-info__fila--monto"><span>Monto</span><strong>${formatPrecio(totalFinal)}</strong></div>
            </div>
          </div>
        )}

        {/* Resumen de productos */}
        {detalles.length > 0 && (
          <div className="pedido-receipt__resumen">
            <div className="pedido-receipt__resumen-header">
              <span>Resumen de tu compra</span>
              {nroPedido && <span className="pedido-receipt__resumen-nro">Pedido N° {nroPedido}</span>}
            </div>
            <table className="pedido-receipt__tabla">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="pedido-receipt__col-num">Cant.</th>
                  <th className="pedido-receipt__col-num">P.Unit.</th>
                  <th className="pedido-receipt__col-num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map(d => (
                  <tr key={d.id}>
                    <td>{d.nombre_producto}</td>
                    <td className="pedido-receipt__col-num">{d.cantidad}</td>
                    <td className="pedido-receipt__col-num">${formatPrecio(d.precio_unitario)}</td>
                    <td className="pedido-receipt__col-num">${formatPrecio(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pedido-receipt__totales">
              <div className="pedido-receipt__total-fila">
                <span>Subtotal</span>
                <span>${formatPrecio(subtotal)}</span>
              </div>
              <div className="pedido-receipt__total-fila">
                <span>Envío {metodoEnvio === 'retiro_farmacia' ? '(retiro en farmacia)' : metodoEnvio === 'domicilio' ? '(a domicilio)' : '(retiro en sucursal)'}</span>
                <span>{costoEnvio === 0 ? <strong className="checkout-totales__gratis">GRATIS</strong> : `$${formatPrecio(costoEnvio)}`}</span>
              </div>
              <div className="pedido-receipt__total-fila pedido-receipt__total-fila--final">
                <span>Total</span>
                <strong>${formatPrecio(totalFinal)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Caja importante */}
        <div className="pedido-receipt__importante">
          {mp === 'transferencia' ? (
            <>
              <p className="pedido-receipt__importante-titulo">Importante:</p>
              <p>
                Una vez realizada la transferencia, respondé el correo de confirmación que te enviamos adjuntando el comprobante.
              </p>
              <p>
                Una vez que informes tu pago y sea acreditado, empezará a correr el plazo de entrega según el método seleccionado.
              </p>
              <p className="pedido-receipt__importante-aviso">
                Los productos permanecerán reservados durante <strong>48 horas hábiles</strong>.
              </p>
            </>
          ) : (
            <>
              <p className="pedido-receipt__importante-titulo">Importante:</p>
              <p>Tené el monto exacto listo al momento de retirar tu pedido en nuestra farmacia.</p>
              <p>Te avisaremos cuando tu pedido esté listo para retirar.</p>
            </>
          )}
        </div>

        {/* Acciones */}
        <div className="pedido-receipt__acciones">
          {pedidoId && (
            <Link to={`/pedidos/${pedidoId}`} className="btn btn--primary">
              Ver mi pedido
            </Link>
          )}
          <Link to="/" className="btn btn--ghost">
            Seguir comprando
          </Link>
        </div>
      </div>
    );
  }

  /* ── Cancelado (el usuario salió de Payway sin pagar) ── */
  if (resultado === 'cancelado') {
    return (
      <div className="pago-resultado pago-resultado--cancelado">
        <div className="pago-resultado__icono">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 className="pago-resultado__titulo">Pago cancelado</h1>
        <p className="pago-resultado__desc">
          Tu pedido fue cancelado y el stock fue liberado. Si querés comprar de nuevo, podés volver al inicio.
        </p>
        {pedidoId && (
          <Link to={`/pedidos/${pedidoId}`} className="btn btn--primary pago-resultado__btn">
            Ver mi pedido
          </Link>
        )}
        <Link to="/" className="pago-resultado__link">Volver al inicio</Link>
      </div>
    );
  }

  /* ── Fallido (pago rechazado por la entidad) ── */
  return (
    <div className="pago-resultado pago-resultado--fallido">
      <div className="pago-resultado__icono">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <h1 className="pago-resultado__titulo">El pago fue rechazado</h1>
      <p className="pago-resultado__desc">Revisá los datos de tu tarjeta o intentá con otro medio de pago.</p>
      {pedidoId && (
        <Link to={`/pedidos/${pedidoId}`} className="btn btn--primary pago-resultado__btn">
          Ver mi pedido
        </Link>
      )}
      <Link to="/" className="pago-resultado__link">Volver al inicio</Link>
    </div>
  );
}
