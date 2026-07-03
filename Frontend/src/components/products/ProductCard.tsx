import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Producto } from '../../types';
import { precioEfectivo, formatPrecio } from '../../types';
import { useCarritoContext } from '../../context/CartContext';
import { useFavoritos } from '../../context/FavoritosContext';
import { staggerItem, heartVariants } from '../ui/motion';

interface Props {
  producto: Producto;
}

export function ProductCard({ producto }: Props) {
  const { agregarItem, abrirCarrito } = useCarritoContext();
  const { esFavorito, toggleFavorito } = useFavoritos();

  const favorito = esFavorito(producto.id);

  const handleAgregar = () => {
    agregarItem(producto, 1);
    abrirCarrito();
  };

  return (
    <motion.div
      className="product-card"
      variants={staggerItem}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={`/productos/${producto.id}`} className="product-card__image-wrap">
        {producto.en_oferta && producto.porcentaje_oferta != null && (
          <span className="oferta-badge oferta-badge--imagen">-{producto.porcentaje_oferta}%</span>
        )}
        <img
          src={producto.imagen_url ?? '/placeholder.png'}
          alt={producto.nombre}
          className="product-card__image"
        />
      </Link>

      <motion.button
        className={`product-card__fav${favorito ? ' product-card__fav--activo' : ''}`}
        onClick={() => toggleFavorito(producto.id)}
        aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        variants={heartVariants}
        animate={favorito ? 'active' : 'inactive'}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          fill={favorito ? 'currentColor' : 'none'} stroke="currentColor">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </motion.button>

      <div className="product-card__body">
        {producto.categoria && (
          <span className="product-card__category">{producto.categoria.nombre}</span>
        )}
        <Link to={`/productos/${producto.id}`}>
          <h3 className="product-card__name">{producto.nombre}</h3>
        </Link>

        {producto.en_oferta && producto.precio_oferta != null ? (
          <div className="product-card__precios">
            <span className="precio--oferta">${formatPrecio(precioEfectivo(producto))}</span>
            <span className="precio--lista">${formatPrecio(producto.precio)}</span>
            {producto.porcentaje_oferta != null && (
              <span className="oferta-badge">-{producto.porcentaje_oferta}%</span>
            )}
          </div>
        ) : (
          <p className="product-card__price">${formatPrecio(producto.precio)}</p>
        )}

        <button
          className="btn btn--primary"
          onClick={handleAgregar}
          disabled={producto.stock === 0}
        >
          {producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
        </button>
      </div>
    </motion.div>
  );
}
