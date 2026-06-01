import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductoPorId } from '../api/productos.api';
import type { Producto } from '../types';
import { precioEfectivo, formatPrecio } from '../types';
import { useCarritoContext } from '../context/CartContext';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagenActiva, setImagenActiva] = useState(0);
  const { agregarItem, abrirCarrito } = useCarritoContext();

  useEffect(() => {
    if (!id) return;
    fetchProductoPorId(id)
      .then(p => { setProducto(p); setImagenActiva(0); })
      .catch(() => setError('Producto no encontrado.'))
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <Spinner />;
  if (error || !producto) return <ErrorMessage message={error ?? 'Producto no encontrado.'} />;

  const handleAgregar = () => {
    agregarItem(producto, 1);
    abrirCarrito();
  };

  const galeria = producto.imagenes?.length
    ? producto.imagenes
    : producto.imagen_url
      ? [producto.imagen_url]
      : [];

  return (
    <div className="page product-detail">
      <Link to="/" className="back-link">← Volver al catálogo</Link>
      <div className="product-detail__content">

        <div className="product-gallery">
          <img
            src={galeria[imagenActiva] ?? '/placeholder.png'}
            alt={producto.nombre}
            className="product-gallery__main"
          />
          {galeria.length > 1 && (
            <div className="product-gallery__thumbs">
              {galeria.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  className={`product-gallery__thumb ${i === imagenActiva ? 'product-gallery__thumb--activa' : ''}`}
                  onClick={() => setImagenActiva(i)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="product-detail__info">
          {producto.categoria && (
            <span className="product-card__category">{producto.categoria.nombre}</span>
          )}
          <h1 className="product-detail__name">{producto.nombre}</h1>
          {producto.descripcion && (
            <p className="product-detail__description">{producto.descripcion}</p>
          )}
          {producto.en_oferta && producto.precio_oferta != null ? (
            <div className="product-card__precios product-detail__precios">
              <span className="precio--oferta">${formatPrecio(precioEfectivo(producto))}</span>
              <span className="precio--lista">${formatPrecio(producto.precio)}</span>
              {producto.porcentaje_oferta != null && (
                <span className="oferta-badge">-{producto.porcentaje_oferta}%</span>
              )}
            </div>
          ) : (
            <p className="product-detail__price">${formatPrecio(producto.precio)}</p>
          )}
          <p className="product-detail__stock">
            {producto.stock > 0 ? `Stock disponible: ${producto.stock}` : 'Sin stock'}
          </p>
          <button
            className="btn btn--primary"
            onClick={handleAgregar}
            disabled={producto.stock === 0}
          >
            {producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
          </button>
        </div>

      </div>
    </div>
  );
}
