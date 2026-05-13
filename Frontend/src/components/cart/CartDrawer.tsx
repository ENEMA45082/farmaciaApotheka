import { useCarritoContext } from '../../context/CartContext';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';

export function CartDrawer() {
  const { abierto, cerrarCarrito, items } = useCarritoContext();

  return (
    <>
      {abierto && <div className="cart-overlay" onClick={cerrarCarrito} />}
      <div className={`cart-drawer ${abierto ? 'cart-drawer--open' : ''}`}>
        <div className="cart-drawer__header">
          <h2>Tu carrito</h2>
          <button className="cart-drawer__close" onClick={cerrarCarrito}>✕</button>
        </div>
        <div className="cart-drawer__items">
          {items.length === 0 ? (
            <p className="cart-drawer__empty">Tu carrito está vacío.</p>
          ) : (
            items.map(item => <CartItem key={item.producto.id} item={item} />)
          )}
        </div>
        {items.length > 0 && <CartSummary />}
      </div>
    </>
  );
}
