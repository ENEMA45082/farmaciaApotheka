import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Mismas rutas que WhatsAppButton excluye para /envio y /pagar (ya redirigen
// solas a /login si no hay sesión) + /login (redundante mostrarlo ahí).
const RUTAS_SIN_BANNER = ['/login', '/envio', '/pagar'];

const DISMISS_KEY = 'apotheka_login_banner_cerrado';

function leerCerrado(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function LoginPromptBanner() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [cerrado, setCerrado] = useState(leerCerrado);

  if (loading || user || cerrado || RUTAS_SIN_BANNER.includes(pathname)) return null;

  function handleCerrar() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // localStorage/sessionStorage bloqueado (modo privado, etc.) — igual
      // se oculta para esta vista, solo no persiste entre navegaciones.
    }
    setCerrado(true);
  }

  return (
    <div className="login-banner" role="dialog" aria-label="Iniciar sesión">
      <button className="login-banner__cerrar" onClick={handleCerrar} aria-label="Cerrar">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <p className="login-banner__texto">
        Iniciá sesión para, ver el stock real de la tienda, guardar productos, realizar compras y acceder a lo que más te interesa.
      </p>
      <Link to={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn--primary login-banner__btn">
        Iniciar sesión
      </Link>
    </div>
  );
}
