import { useLocation, useNavigate } from 'react-router-dom';

const TABS: { label: string; path: string }[] = [
  { label: 'Productos',              path: '/admin/productos' },
  { label: 'Categorías',             path: '/admin/categorias' },
  { label: 'Cartelería',             path: '/admin/carteleria' },
  { label: 'Pedidos',                path: '/admin/pedidos' },
  { label: 'Importar precios',       path: '/admin/importar-precios' },
  { label: 'Facturas con problemas', path: '/admin/facturas' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p className="admin-subtitle">Gestión de productos y categorías de la farmacia</p>
      </div>

      <div className="admin-tabs">
        {TABS.map(tab => (
          <button
            key={tab.path}
            className={`admin-tab ${location.pathname === tab.path ? 'admin-tab--activa' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {children}
    </div>
  );
}
