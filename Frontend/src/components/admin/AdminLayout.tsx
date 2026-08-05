import { Link, useLocation } from 'react-router-dom';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p className="admin-subtitle">Gestión de productos y categorías de la farmacia</p>
      </div>

      {location.pathname !== '/admin' && (
        <Link to="/admin" className="back-link">← Volver</Link>
      )}

      {children}
    </div>
  );
}
