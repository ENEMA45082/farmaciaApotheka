import { useCarritoContext } from '../../context/CartContext';

export function CartSummary() {
  const { totalPrecio, subtotalLista, totalItems, vaciarCarrito } = useCarritoContext();
  const hayAhorro = subtotalLista > totalPrecio;

  return (
    <div className="cart-summary">
      {hayAhorro && (
        <>
          <p className="cart-summary__lista">
            Precio de lista: <s>${subtotalLista.toFixed(2)}</s>
          </p>
          <p className="cart-summary__ahorro">
            Ahorrás: ${(subtotalLista - totalPrecio).toFixed(2)}
          </p>
        </>
      )}
      <p className="cart-summary__total">
        Total ({totalItems} {totalItems === 1 ? 'producto' : 'productos'}):
        <strong> ${totalPrecio.toFixed(2)}</strong>
      </p>
      <button className="btn btn--primary btn--full">Ir a pagar</button>
      <button className="btn btn--ghost btn--full" onClick={vaciarCarrito}>
        Vaciar carrito
      </button>
    </div>
  );
}
