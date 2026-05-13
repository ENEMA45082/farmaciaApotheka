import type { Producto } from '../../types';
import { ProductCard } from './ProductCard';
import { Spinner } from '../ui/Spinner';
import { ErrorMessage } from '../ui/ErrorMessage';

interface Props {
  productos: Producto[];
  cargando: boolean;
  error: string | null;
}

export function ProductGrid({ productos, cargando, error }: Props) {
  if (cargando) return <Spinner />;
  if (error)    return <ErrorMessage message={error} />;
  if (productos.length === 0) {
    return <p className="empty-state">No se encontraron productos.</p>;
  }

  return (
    <div className="product-grid">
      {productos.map(p => (
        <ProductCard key={p.id} producto={p} />
      ))}
    </div>
  );
}
