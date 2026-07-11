import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchProductoPorId } from '../api/productos.api';
import type { Producto } from '../types';
import { precioEfectivo, formatPrecio } from '../types';
import { useCarritoContext } from '../context/CartContext';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { staggerContainer, staggerItem } from '../components/ui/motion';
import { BotonCompartir } from '../components/products/BotonCompartir';

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

        {/* Galería con crossfade */}
        <div className="product-gallery">
          <AnimatePresence mode="wait">
            <motion.img
              key={imagenActiva}
              src={galeria[imagenActiva] ?? '/placeholder.png'}
              alt={producto.nombre}
              className="product-gallery__main"
              width={800}
              height={420}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>
          {galeria.length > 1 && (
            <div className="product-gallery__thumbs">
              {galeria.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  width={70}
                  height={70}
                  loading="lazy"
                  className={`product-gallery__thumb ${i === imagenActiva ? 'product-gallery__thumb--activa' : ''}`}
                  onClick={() => setImagenActiva(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info con stagger */}
        <motion.div
          className="product-detail__info"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {producto.categoria && (
            <motion.span className="product-card__category" variants={staggerItem}>
              {producto.categoria.nombre}
            </motion.span>
          )}
          <motion.h1 className="product-detail__name" variants={staggerItem}>
            {producto.nombre}
          </motion.h1>
          {producto.descripcion && (
            <motion.p className="product-detail__description" variants={staggerItem}>
              {producto.descripcion}
            </motion.p>
          )}
          <motion.div variants={staggerItem}>
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
          </motion.div>
          <motion.p className="product-detail__stock" variants={staggerItem}>
            {producto.stock > 0 ? `Stock disponible: ${producto.stock}` : 'Sin stock'}
          </motion.p>
          <motion.div className="product-detail__actions" variants={staggerItem}>
            <motion.button
              className="btn btn--primary"
              onClick={handleAgregar}
              disabled={producto.stock === 0}
              whileHover={producto.stock > 0 ? { y: -2 } : {}}
              whileTap={producto.stock > 0 ? { scale: 0.97 } : {}}
            >
              {producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
            </motion.button>
            <BotonCompartir nombre={producto.nombre} />
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
