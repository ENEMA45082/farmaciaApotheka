import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFavoritos } from '../context/FavoritosContext';
import { fetchFavoritos } from '../api/favoritos.api';
import { ProductGrid } from '../components/products/ProductGrid';
import type { Producto } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export function FavoritosPage() {
  const { user, loading: authLoading } = useAuth();
  const { favoritoIds } = useFavoritos();
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    setCargando(true);
    fetchFavoritos()
      .then(async ids => {
        if (ids.length === 0) { setProductos([]); return; }
        const res = await fetch(`${API_URL}/productos?ids=${ids.join(',')}`);
        if (!res.ok) { setProductos([]); return; }
        // Traemos los productos de a uno en paralelo si el endpoint no soporta ids
        const results = await Promise.allSettled(
          ids.map(id => fetch(`${API_URL}/productos/${id}`).then(r => r.json()))
        );
        const prods = results
          .filter((r): r is PromiseFulfilledResult<Producto> => r.status === 'fulfilled')
          .map(r => r.value);
        setProductos(prods);
      })
      .catch(() => setProductos([]))
      .finally(() => setCargando(false));
  }, [user, favoritoIds]);

  if (!authLoading && !user) return null;

  return (
    <div className="page">
      <div className="ofertas-header">
        <h1 className="ofertas-titulo">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="none" style={{ color: '#e53e3e', flexShrink: 0 }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Mis Favoritos
        </h1>
      </div>

      {!cargando && productos.length === 0 ? (
        <div className="pedidos-vacio">
          <p>Todavía no marcaste ningún favorito.</p>
          <Link to="/" className="btn btn--primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Ver productos
          </Link>
        </div>
      ) : (
        <ProductGrid productos={productos} cargando={cargando} error={null} />
      )}
    </div>
  );
}
