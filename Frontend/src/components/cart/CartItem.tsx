import { motion } from 'framer-motion';
import type { ItemCarrito } from '../../types';
import { precioEfectivo, descuento2x1, subtotalLinea, formatPrecio } from '../../types';
import { useCarritoContext } from '../../context/CartContext';
import { staggerItem } from '../ui/motion';

interface Props {
  item: ItemCarrito;
}

export function CartItem({ item }: Props) {
  const { actualizarCantidad, quitarItem } = useCarritoContext();
  const { producto, cantidad } = item;
  const efectivo = precioEfectivo(producto);
  const descuento = descuento2x1(producto, cantidad);

  return (
    <motion.div
      className="cart-item"
      variants={staggerItem}
      layout
      exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
    >
      <img
        src={producto.imagen_url ?? '/placeholder.png'}
        alt={producto.nombre}
        className="cart-item__image"
        width={64}
        height={64}
        loading="lazy"
      />
      <div className="cart-item__info">
        <p className="cart-item__name">{producto.nombre}</p>
        <p className="cart-item__price">
          ${formatPrecio(efectivo)}
          {producto.en_oferta && (
            <span className="cart-item__precio-lista">${formatPrecio(producto.precio)}</span>
          )}
        </p>
        {descuento > 0 && (
          <p className="cart-item__descuento-2x1">2x1: -${formatPrecio(descuento)}</p>
        )}
        <div className="cart-item__qty">
          <button onClick={() => actualizarCantidad(producto.id, cantidad - 1)}>-</button>
          <motion.span
            key={cantidad}
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            {cantidad}
          </motion.span>
          <button onClick={() => actualizarCantidad(producto.id, cantidad + 1)}>+</button>
        </div>
      </div>
      <div className="cart-item__right">
        <p className="cart-item__subtotal">${formatPrecio(subtotalLinea(producto, cantidad))}</p>
        <motion.button
          className="cart-item__remove"
          onClick={() => quitarItem(producto.id)}
          whileHover={{ scale: 1.15, color: '#e53935' }}
          transition={{ duration: 0.15 }}
        >
          ✕
        </motion.button>
      </div>
    </motion.div>
  );
}
