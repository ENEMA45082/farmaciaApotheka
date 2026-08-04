import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Categoria } from '../../types';
import { slugify } from '../../utils/slug';
import { overlayVariants, drawerVariantsLeft } from '../ui/motion';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  arbol: Categoria[];
  onNavegar: (url: string) => void;
  esAdmin: boolean;
}

export function MobileNavDrawer({ abierto, onCerrar, arbol, onNavegar, esAdmin }: Props) {
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  useBodyScrollLock(abierto);

  function toggleExpandida(id: string) {
    setExpandidas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <>
      <AnimatePresence>
        {abierto && (
          <motion.div
            className="mobile-nav-overlay"
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onCerrar}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {abierto && (
          <motion.div
            className="mobile-nav-drawer"
            variants={drawerVariantsLeft}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="mobile-nav-drawer__header">
              <h2>Menú</h2>
              <button className="mobile-nav-drawer__cerrar" onClick={onCerrar} aria-label="Cerrar menú">✕</button>
            </div>

            <div className="mobile-nav-drawer__body">
              <button
                className="mobile-nav-drawer__ofertas"
                onClick={() => onNavegar('/ofertas')}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none">
                  <path d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.42l9 9A2 2 0 0 0 13 22a2 2 0 0 0 1.41-.59l7-7A2 2 0 0 0 22 13a2 2 0 0 0-.59-1.42zM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8z"/>
                </svg>
                OFERTAS
              </button>

              <button className="mega-menu__ver-todo" onClick={() => onNavegar('/')}>
                Ver todos los productos →
              </button>

              <div className="mobile-nav-accordion">
                {arbol.map(cat => {
                  const hijos = cat.hijos ?? [];
                  const tieneHijos = hijos.length > 0;
                  const abierta = expandidas.has(cat.id);
                  return (
                    <div key={cat.id} className="mobile-nav-accordion__seccion">
                      <button
                        className="mobile-nav-accordion__titulo"
                        onClick={() => tieneHijos ? toggleExpandida(cat.id) : onNavegar(`/categoria/${slugify(cat.nombre)}`)}
                      >
                        {cat.nombre}
                        {tieneHijos && (
                          <span className={`nav-mega__arrow${abierta ? ' nav-mega__arrow--open' : ''}`}>▾</span>
                        )}
                      </button>
                      {tieneHijos && abierta && (
                        <div className="mobile-nav-accordion__hijos">
                          {hijos.map(sub => (
                            <button
                              key={sub.id}
                              className="mega-menu__col-item"
                              onClick={() => onNavegar(`/categoria/${slugify(sub.nombre)}`)}
                            >
                              <span className="mega-menu__col-arrow">›</span>
                              {sub.nombre}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {esAdmin && (
                <div className="mobile-nav-drawer__admin">
                  <button className="header__nav-item header__nav-item--admin" onClick={() => onNavegar('/admin')}>Admin</button>
                  <button className="header__nav-item header__nav-item--admin" onClick={() => onNavegar('/estadisticas')}>Estadísticas</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
