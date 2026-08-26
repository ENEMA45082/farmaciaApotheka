import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Producto } from '../../types';
import { precioEfectivo, formatPrecio } from '../../types';
import { useCarritoContext } from '../../context/CartContext';
import { useFavoritos } from '../../context/FavoritosContext';
import { staggerItem, heartVariants } from '../ui/motion';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

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
      variants={staggerItem}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
        <Link to={`/productos/${producto.id}`} className="relative block">
          {producto.en_oferta && producto.porcentaje_oferta != null && (
            <span className="absolute top-2.5 left-2.5 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
              -{producto.porcentaje_oferta}%
            </span>
          )}
          {producto.es_2x1 && (
            <span className="absolute top-2.5 left-2.5 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
              2x1
            </span>
          )}
          <img
            src={producto.imagen_url ?? '/placeholder.png'}
            alt={producto.nombre}
            className="h-[180px] w-full bg-white object-contain p-2 sm:h-[180px]"
            width={400}
            height={180}
            loading="lazy"
          />
        </Link>

        <motion.button
          className={cn(
            'absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-300 shadow-sm transition-colors hover:bg-white hover:text-red-500',
            favorito && 'text-red-500'
          )}
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

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          {producto.categoria && (
            <span className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
              {producto.categoria.nombre}
            </span>
          )}
          <Link to={`/productos/${producto.id}`}>
            <h3 className="text-sm leading-snug font-semibold text-ink">{producto.nombre}</h3>
          </Link>

          {producto.en_oferta && producto.precio_oferta != null ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-bold text-red-600">${formatPrecio(precioEfectivo(producto))}</span>
              <span className="text-sm text-muted line-through">${formatPrecio(producto.precio)}</span>
            </div>
          ) : producto.es_2x1 ? (
            <p className="text-lg font-bold text-navy">${formatPrecio(producto.precio)}</p>
          ) : (
            <p className="text-lg font-bold text-navy">${formatPrecio(producto.precio)}</p>
          )}

          <button
            className="mt-auto w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleAgregar}
            disabled={producto.stock === 0}
          >
            {producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
          </button>
        </div>
      </Card>
    </motion.div>
  );
}
