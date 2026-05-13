import type { ItemCarrito } from '../../types';
import { precioEfectivo } from '../../types';
import { useCarritoContext } from '../../context/CartContext';

interface Props {
  item: ItemCarrito;
}

export function CartItem({ item }: Props) {
  const { actualizarCantidad, quitarItem } = useCarritoContext();
  const { producto, cantidad } = item;
  const efectivo = precioEfectivo(producto);

  return (
    <div className="cart-item">
      <img
        src={producto.imagen_url ?? '/placeholder.png'}
        alt={producto.nombre}
        className="cart-item__image"
      />
      <div className="cart-item__info">
        <p className="cart-item__name">{producto.nombre}</p>
        <p className="cart-item__price">
          ${efectivo.toFixed(2)}
          {producto.en_oferta && (
            <span className="cart-item__precio-lista">${producto.precio.toFixed(2)}</span>
          )}
        </p>
        <div className="cart-item__qty">
          <button onClick={() => actualizarCantidad(producto.id, cantidad - 1)}>-</button>
          <span>{cantidad}</span>
          <button onClick={() => actualizarCantidad(producto.id, cantidad + 1)}>+</button>
        </div>
      </div>
      <div className="cart-item__right">
        <p className="cart-item__subtotal">${(efectivo * cantidad).toFixed(2)}</p>
        <button className="cart-item__remove" onClick={() => quitarItem(producto.id)}>✕</button>
      </div>
    </div>
  );
}
