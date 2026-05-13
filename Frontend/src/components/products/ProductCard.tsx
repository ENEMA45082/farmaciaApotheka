import { Link } from 'react-router-dom';
import type { Producto } from '../../types';
import { precioEfectivo } from '../../types';
import { useCarritoContext } from '../../context/CartContext';

interface Props {
  producto: Producto;
}

export function ProductCard({ producto }: Props) {
  const { agregarItem, abrirCarrito } = useCarritoContext();

  const handleAgregar = () => {
    agregarItem(producto, 1);
    abrirCarrito();
  };

  return (
    <div className="product-card">
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
      <div className="product-card__body">
        {producto.categoria && (
          <span className="product-card__category">{producto.categoria.nombre}</span>
        )}
        <Link to={`/productos/${producto.id}`}>
          <h3 className="product-card__name">{producto.nombre}</h3>
        </Link>

        {producto.en_oferta && producto.precio_oferta != null ? (
          <div className="product-card__precios">
            <span className="precio--oferta">${precioEfectivo(producto).toFixed(2)}</span>
            <span className="precio--lista">${producto.precio.toFixed(2)}</span>
            {producto.porcentaje_oferta != null && (
              <span className="oferta-badge">-{producto.porcentaje_oferta}%</span>
            )}
          </div>
        ) : (
          <p className="product-card__price">${producto.precio.toFixed(2)}</p>
        )}

        <button
          className="btn btn--primary"
          onClick={handleAgregar}
          disabled={producto.stock === 0}
        >
          {producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  );
}
