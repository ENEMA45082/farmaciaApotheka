import { useNavigate } from 'react-router-dom';
import { useCarritoContext } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatPrecio } from '../../types';

export function CartSummary() {
  const { totalPrecio, subtotalLista, totalItems, vaciarCarrito, cerrarCarrito } = useCarritoContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const hayAhorro = subtotalLista > totalPrecio;

  function handleIniciarCompra() {
    cerrarCarrito();
    if (!user) {
      navigate('/login?next=checkout');
      return;
    }
    navigate('/envio');
  }

  return (
    <div className="cart-summary">
      {hayAhorro && (
        <>
          <p className="cart-summary__lista">
            Precio de lista: <s>${formatPrecio(subtotalLista)}</s>
          </p>
          <p className="cart-summary__ahorro">
            Ahorrás: ${formatPrecio(subtotalLista - totalPrecio)}
          </p>
        </>
      )}
      <p className="cart-summary__total">
        Total ({totalItems} {totalItems === 1 ? 'producto' : 'productos'}):
        <strong> ${formatPrecio(totalPrecio)}</strong>
      </p>
      <button className="btn btn--primary btn--full" onClick={handleIniciarCompra}>
        {user ? 'Iniciar compra' : 'Iniciar sesión para comprar'}
      </button>
      <button className="btn btn--ghost btn--full" onClick={vaciarCarrito}>
        Vaciar carrito
      </button>
    </div>
  );
}
