import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Categoria } from '../../types';
import { formatPrecio } from '../../types';
import { useCarritoContext } from '../../context/CartContext';
import { useCategoriasArbol } from '../../hooks/useCategoriasArbol';
import { useAuth } from '../../context/AuthContext';

function flattenArbol(cats: Categoria[]): Categoria[] {
  return cats.flatMap(c => [c, ...flattenArbol(c.hijos ?? [])]);
}

export function Header() {
  const { totalItems, totalPrecio, abrirCarrito } = useCarritoContext();
  const { arbol } = useCategoriasArbol();
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();

  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [userMenuAbierto, setUserMenuAbierto] = useState(false);
  const [megaMenuAbierto, setMegaMenuAbierto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatCats = flattenArbol(arbol);
  const catMedicamentos = flatCats.find(c => c.nombre.toLowerCase().includes('cuidado') && c.nombre.toLowerCase().includes('salud'));
  const catPerfumeria   = flatCats.find(c => c.nombre.toLowerCase().includes('perfum') || c.nombre.toLowerCase().includes('fragancia'));
  const catOrtopedia    = flatCats.find(c => c.nombre.toLowerCase().includes('ortoped'));

  function handleBuscar(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (textoBusqueda.trim()) {
      navigate(`/?busqueda=${encodeURIComponent(textoBusqueda.trim())}`);
      setTextoBusqueda('');
      inputRef.current?.blur();
    }
  }

  function navegar(url: string) {
    setMegaMenuAbierto(false);
    navigate(url);
  }

  return (
    <header className="header">

      {/* ── Fila superior: logo + buscador + acciones ── */}
      <div className="header__top">
        <Link to="/" className="header__logo">
          <span className="header__logo-name">Apotheka</span>
          <span className="header__logo-sub">FARMACIA</span>
        </Link>

        <form className="header-search" onSubmit={handleBuscar}>
          <input
            ref={inputRef}
            className="header-search__input"
            type="text"
            placeholder="Buscar producto o categoría"
            value={textoBusqueda}
            onChange={e => setTextoBusqueda(e.target.value)}
          />
          <button type="submit" className="header-search__btn" aria-label="Buscar">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </form>

        <div className="header__actions">
          <Link to="/pedidos" className="header__pedidos-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><path d="M3 10h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>
            </svg>
            Mis pedidos
          </Link>

          <div
            className="header-user"
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setUserMenuAbierto(false); }}
          >
            <button
              className="header-user__btn"
              onClick={() => setUserMenuAbierto(v => !v)}
              aria-label="Mi cuenta"
            >
              {user?.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} className="header-user__avatar" alt="avatar" referrerPolicy="no-referrer" />
                : (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                )
              }
              <span className="header-user__label">Mi cuenta</span>
            </button>

            {userMenuAbierto && (
              <div className="header-user__menu">
                {user ? (
                  <>
                    <p className="header-user__saludo">¡Hola!</p>
                    <hr className="header-user__sep" />
                    <Link className="header-user__item" to="/pedidos" onClick={() => setUserMenuAbierto(false)}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><path d="M3 10h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>
                      Mis Pedidos
                    </Link>
                    <Link className="header-user__item" to="/perfil" onClick={() => setUserMenuAbierto(false)}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Mis Datos
                    </Link>
                    <Link className="header-user__item" to="/direcciones" onClick={() => setUserMenuAbierto(false)}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      Mis Direcciones
                    </Link>
                    <hr className="header-user__sep" />
                    <button className="header-user__item header-user__item--logout" onClick={() => { signOut(); setUserMenuAbierto(false); }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <button className="header-user__item" onClick={() => { signInWithGoogle(window.location.origin + '/'); setUserMenuAbierto(false); }}>
                    Iniciar sesión con Google
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Favoritos */}
          <Link to="/favoritos" className="header__fav-btn" aria-label="Mis favoritos">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </Link>

          {/* Carrito */}
          <button className="cart-btn" onClick={abrirCarrito} aria-label="Abrir carrito">
            <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {totalItems > 0 && <span className="cart-btn__badge">{totalItems}</span>}
          </button>
          <span className="cart-btn__precio">${formatPrecio(totalPrecio)}</span>
        </div>
      </div>

      {/* ── Fila inferior: nav + mega-menú ── */}
      <nav
        className="header__nav-bar"
        onMouseLeave={() => setMegaMenuAbierto(false)}
      >
        <div className="header__nav-inner">

          {/* Trigger del mega-menú */}
          <button
            className={`header__nav-item nav-mega__trigger${megaMenuAbierto ? ' nav-mega__trigger--activo' : ''}`}
            onMouseEnter={() => setMegaMenuAbierto(true)}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            Categorías
            <span className={`nav-mega__arrow${megaMenuAbierto ? ' nav-mega__arrow--open' : ''}`}>▾</span>
          </button>

          {/* OFERTAS */}
          <button className="header__nav-item header__nav-item--ofertas" onClick={() => navegar('/ofertas')}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none">
              <path d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.42l9 9A2 2 0 0 0 13 22a2 2 0 0 0 1.41-.59l7-7A2 2 0 0 0 22 13a2 2 0 0 0-.59-1.42zM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8z"/>
            </svg>
            OFERTAS
          </button>

          {/* Categorías destacadas */}
          {catMedicamentos && (
            <button className="header__nav-item" onClick={() => navegar(`/?categoria=${catMedicamentos.id}`)}>
              Medicamentos
            </button>
          )}
          {catPerfumeria && (
            <button className="header__nav-item" onClick={() => navegar(`/?categoria=${catPerfumeria.id}`)}>
              Perfumería
            </button>
          )}
          {catOrtopedia && (
            <button className="header__nav-item" onClick={() => navegar(`/?categoria=${catOrtopedia.id}`)}>
              Ortopedia
            </button>
          )}

          {user?.app_metadata?.role === 'admin' && (
            <>
              <Link to="/admin" className="header__nav-item header__nav-item--admin">Admin</Link>
              <Link to="/estadisticas" className="header__nav-item header__nav-item--admin">Estadísticas</Link>
            </>
          )}
        </div>

        {/* ── Mega-menú ── */}
        {megaMenuAbierto && (
          <div
            className="mega-menu"
            onMouseEnter={() => setMegaMenuAbierto(true)}
          >
            <div className="mega-menu__inner">
              <button
                className="mega-menu__ver-todo"
                onClick={() => navegar('/')}
              >
                Ver todos los productos →
              </button>
              <div className="mega-menu__grid">
                {arbol.map(cat => (
                  <div key={cat.id} className="mega-menu__col">
                    <button
                      className="mega-menu__col-titulo"
                      onClick={() => navegar(`/?categoria=${cat.id}`)}
                    >
                      {cat.nombre.toUpperCase()}
                    </button>
                    {(cat.hijos ?? []).map(sub => (
                      <button
                        key={sub.id}
                        className="mega-menu__col-item"
                        onClick={() => navegar(`/?categoria=${sub.id}`)}
                      >
                        <span className="mega-menu__col-arrow">›</span>
                        {sub.nombre}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

    </header>
  );
}
