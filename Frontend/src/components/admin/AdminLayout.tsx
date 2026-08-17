import { Link, useLocation } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  subtitle?: string;
}

export function AdminLayout({ children, subtitle = 'Elegí una sección para gestionar la farmacia' }: Props) {
  const location = useLocation();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p className="admin-subtitle">{subtitle}</p>
      </div>

      {location.pathname !== '/admin' && (
        <Link to="/admin" className="back-link">← Volver</Link>
      )}

      {children}
    </div>
  );
}
