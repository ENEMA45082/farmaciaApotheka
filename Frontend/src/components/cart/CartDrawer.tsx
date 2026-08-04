import { AnimatePresence, motion } from 'framer-motion';
import { useCarritoContext } from '../../context/CartContext';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { overlayVariants, drawerVariants, staggerContainer } from '../ui/motion';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export function CartDrawer() {
  const { abierto, cerrarCarrito, items } = useCarritoContext();
  useBodyScrollLock(abierto);

  return (
    <>
      <AnimatePresence>
        {abierto && (
          <motion.div
            className="cart-overlay"
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={cerrarCarrito}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {abierto && (
          <motion.div
            className="cart-drawer"
            variants={drawerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="cart-drawer__header">
              <h2>Tu carrito</h2>
              <button className="cart-drawer__close" onClick={cerrarCarrito}>✕</button>
            </div>
            <div className="cart-drawer__items">
              {items.length === 0 ? (
                <motion.p
                  className="cart-drawer__empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.2 } }}
                >
                  Tu carrito está vacío.
                </motion.p>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  <AnimatePresence>
                    {items.map(item => <CartItem key={item.producto.id} item={item} />)}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
            {items.length > 0 && <CartSummary />}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
