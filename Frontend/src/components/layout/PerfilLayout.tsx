import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const TABS: { label: string; path: string | null }[] = [
  { label: 'Perfil',               path: '/perfil'      },
  { label: 'Direcciones',          path: '/direcciones'  },
  { label: 'Pedidos',              path: '/pedidos'      },
  { label: 'Tarjetas de crédito',  path: null            },
  { label: 'Autenticación',        path: null            },
  { label: 'Suscripciones',        path: null            },
];

export function PerfilLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const nombre = user?.user_metadata?.full_name || 'Usuario';

  return (
    <div className="perfil-page">

      <aside className="perfil-sidebar">
        <div className="perfil-avatar-wrap">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              className="perfil-avatar"
              alt="avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="perfil-avatar perfil-avatar--placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          )}
          <p className="perfil-bienvenida">¡Bienvenido/a {nombre}!</p>
        </div>

        <nav className="perfil-nav">
          {TABS.map(tab => (
            <button
              key={tab.label}
              className={`perfil-nav__item ${location.pathname === tab.path ? 'perfil-nav__item--active' : ''}`}
              onClick={() => tab.path && navigate(tab.path)}
              disabled={!tab.path}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="perfil-content">
        {children}
      </div>

    </div>
  );
}
