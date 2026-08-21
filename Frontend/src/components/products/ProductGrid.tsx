import { motion } from 'framer-motion';
import type { Producto } from '../../types';
import { ProductCard } from './ProductCard';
import { Spinner } from '../ui/Spinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { staggerContainer } from '../ui/motion';

interface Props {
  productos: Producto[];
  cargando: boolean;
  error: string | null;
}

export function ProductGrid({ productos, cargando, error }: Props) {
  if (cargando) return <Spinner />;
  if (error)    return <ErrorMessage message={error} />;
  if (productos.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">No se encontraron productos.</p>;
  }

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 py-2 sm:gap-5 sm:py-4 sm:[grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {productos.map(p => (
        <ProductCard key={p.id} producto={p} />
      ))}
    </motion.div>
  );
}
