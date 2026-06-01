import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useCarritoContext } from '../context/CartContext';
import { fetchPedidoPorId } from '../api/pedidos.api';
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
  const [pedido, setPedido] = useState<Pedido | null>(null);

  useEffect(() => {
    if (resultado === 'exitoso') vaciarCarrito();
  }, [resultado]);

  useEffect(() => {
    if (resultado === 'pendiente' && pedidoId) {
      fetchPedidoPorId(pedidoId).then(setPedido).catch(() => {});
    }
  }, [resultado, pedidoId]);

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

  if (resultado === 'pendiente') {
    const mp = pedido?.metodo_pago;
    return (
      <div className="pago-resultado pago-resultado--pendiente">
        <div className="pago-resultado__icono">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>

        {mp === 'transferencia' ? (
          <>
            <h1 className="pago-resultado__titulo">¡Pedido registrado!</h1>
            <p className="pago-resultado__desc">Realizá la transferencia para confirmar tu pedido.</p>
            <div className="pago-resultado__info-box">
              <div className="pago-info__fila"><span>Banco</span><strong>{BANCO_FARMACIA}</strong></div>
              <div className="pago-info__fila"><span>Titular</span><strong>{TITULAR}</strong></div>
              <div className="pago-info__fila"><span>CBU</span><strong>{CBU_FARMACIA}</strong></div>
              <div className="pago-info__fila"><span>Alias</span><strong>{ALIAS_FARMACIA}</strong></div>
            </div>
            <p className="pago-resultado__desc" style={{ fontSize: '0.85rem' }}>Confirmamos tu pedido cuando recibamos el pago.</p>
          </>
        ) : mp === 'efectivo' ? (
          <>
            <h1 className="pago-resultado__titulo">¡Pedido registrado!</h1>
            <p className="pago-resultado__desc">Pagás en efectivo al retirar tu pedido en la farmacia.</p>
          </>
        ) : (
          <>
            <h1 className="pago-resultado__titulo">Pago en proceso</h1>
            <p className="pago-resultado__desc">Tu pago está siendo procesado. Te notificaremos cuando se acredite.</p>
          </>
        )}

        {pedidoId && (
          <Link to={`/pedidos/${pedidoId}`} className="btn btn--primary pago-resultado__btn">
            Ver mi pedido
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="pago-resultado pago-resultado--fallido">
      <div className="pago-resultado__icono">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <h1 className="pago-resultado__titulo">El pago no pudo procesarse</h1>
      <p className="pago-resultado__desc">Revisá los datos de tu tarjeta o intentá con otro medio de pago.</p>
      <Link to="/checkout" className="btn btn--primary pago-resultado__btn">
        Intentar de nuevo
      </Link>
      <Link to="/" className="pago-resultado__link">Volver al inicio</Link>
    </div>
  );
}
