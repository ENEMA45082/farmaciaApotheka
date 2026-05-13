import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCarritoContext } from '../../context/CartContext';
import { useCategorias } from '../../hooks/useCategorias';

export function Header() {
  const { totalItems, abrirCarrito } = useCarritoContext();
  const { categorias } = useCategorias();
  const navigate = useNavigate();

  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const abrirBusqueda = () => {
    setBusquedaAbierta(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleBuscar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (textoBusqueda.trim()) {
      navigate(`/?busqueda=${encodeURIComponent(textoBusqueda.trim())}`);
      setBusquedaAbierta(false);
      setTextoBusqueda('');
    }
  };

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__logo">
          <span className="header__logo-name">Apotheka</span>
          <span className="header__logo-sub">FARMACIA</span>
        </Link>

        <nav className="header__nav">
          <div className="nav-dropdown">
            <button className="nav-dropdown__trigger">
              CATEGORÍAS <span className="nav-dropdown__arrow">▾</span>
            </button>
            <div className="nav-dropdown__menu">
              <button
                className="nav-dropdown__item nav-dropdown__item--all"
                onClick={() => navigate('/')}
              >
                Ver todos los productos
              </button>
              {categorias.map(cat => (
                <button
                  key={cat.id}
                  className="nav-dropdown__item"
                  onClick={() => navigate(`/?categoria=${cat.slug}`)}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>

          <Link to="/" className="header__nav-link">Inicio</Link>
          <Link to="/?categoria=medicamentos"     className="header__nav-link">Medicamentos</Link>
          <Link to="/?categoria=cuidado-personal" className="header__nav-link">Cuidado Personal</Link>
          <Link to="/?categoria=vitaminas"        className="header__nav-link">Vitaminas</Link>
        </nav>

        <div className="header__actions">
          {/* Buscador */}
          <form
            className={`header-search ${busquedaAbierta ? 'header-search--open' : ''}`}
            onSubmit={handleBuscar}
            onBlur={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setBusquedaAbierta(false);
                setTextoBusqueda('');
              }
            }}
          >
            <input
              ref={inputRef}
              className="header-search__input"
              type="text"
              placeholder="Buscar productos..."
              value={textoBusqueda}
              onChange={e => setTextoBusqueda(e.target.value)}
            />
            <button
              type={busquedaAbierta ? 'submit' : 'button'}
              className="header-icon-btn"
              onClick={!busquedaAbierta ? abrirBusqueda : undefined}
              aria-label="Buscar"
            >
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </form>

          {/* Admin */}
          <Link to="/admin" className="header__admin-btn" title="Panel de administración">Admin</Link>

          {/* Usuario (futuro login) */}
          <button className="header-icon-btn" aria-label="Mi cuenta" title="Próximamente: inicio de sesión">
            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>

          {/* Carrito */}
          <button className="cart-btn" onClick={abrirCarrito} aria-label="Abrir carrito">
            <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {totalItems > 0 && (
              <span className="cart-btn__badge">{totalItems}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
