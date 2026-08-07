import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProductos } from '../../hooks/useProductos';
import { ProductCard } from '../products/ProductCard';
import { staggerContainer } from '../ui/motion';

export function ProductosDestacadosCarousel() {
  const { productos, cargando, error } = useProductos({ en_oferta: true, limite: 10 });
  const trackRef = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(true);

  const actualizarFlechas = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setPuedeIzq(track.scrollLeft > 4);
    setPuedeDer(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }, []);

  useEffect(() => { actualizarFlechas(); }, [productos, actualizarFlechas]);

  useEffect(() => {
    window.addEventListener('resize', actualizarFlechas);
    return () => window.removeEventListener('resize', actualizarFlechas);
  }, [actualizarFlechas]);

  function desplazar(direccion: 1 | -1) {
    trackRef.current?.scrollBy({ left: direccion * trackRef.current.clientWidth * 0.85, behavior: 'smooth' });
  }

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
