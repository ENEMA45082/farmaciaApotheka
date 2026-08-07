import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProductos } from '../../hooks/useProductos';
import { useCarruselScroll } from '../../hooks/useCarruselScroll';
import { ProductCard } from '../products/ProductCard';
import { staggerContainer } from '../ui/motion';

export function ProductosDestacadosCarousel() {
  const { productos, cargando, error } = useProductos({ en_oferta: true, limite: 10 });
  const { trackRef, puedeIzq, puedeDer, actualizarFlechas, desplazar } = useCarruselScroll(productos);

  if (cargando || error || productos.length === 0) return null;

  return (
    <div className="destacados-carousel">
      <div className="destacados-carousel__header">
        <h2 className="destacados-carousel__titulo">Los elegidos de Apotheka</h2>
        <div className="destacados-carousel__acciones">
          <Link to="/ofertas" className="destacados-carousel__ver-todas">Ver todas las ofertas →</Link>
          <div className="destacados-carousel__flechas">
            <button
              type="button"
              className="destacados-carousel__arrow destacados-carousel__arrow--prev"
              aria-label="Productos anteriores"
              onClick={() => desplazar(-1)}
              disabled={!puedeIzq}
            >
              ‹
            </button>
            <button
              type="button"
              className="destacados-carousel__arrow destacados-carousel__arrow--next"
              aria-label="Productos siguientes"
              onClick={() => desplazar(1)}
              disabled={!puedeDer}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <motion.div
        className="destacados-carousel__track"
        ref={trackRef}
        onScroll={actualizarFlechas}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {productos.map(p => (
          <div className="destacados-carousel__item" key={p.id}>
            <ProductCard producto={p} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
