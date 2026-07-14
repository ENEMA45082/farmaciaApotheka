import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Opcion {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  opciones: Opcion[];
}

export function SortSelect({ value, onChange, opciones }: Props) {
  const [abierto, setAbierto] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const seleccionada = opciones.find(o => o.value === value) ?? opciones[0];

  useEffect(() => {
    const handleClickFuera = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', handleClickFuera);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickFuera);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className="sort-select" ref={wrapRef}>
      <button
        type="button"
        className="sort-select__trigger"
        onClick={() => setAbierto(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <span>{seleccionada?.label}</span>
        <svg
          className={`sort-select__chevron${abierto ? ' sort-select__chevron--abierto' : ''}`}
          viewBox="0 0 24 24" width="16" height="16" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="currentColor"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.ul
            className="sort-select__menu"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {opciones.map(opcion => (
              <li
                key={opcion.value}
                role="option"
                aria-selected={opcion.value === value}
                className={`sort-select__opcion${opcion.value === value ? ' sort-select__opcion--activa' : ''}`}
                onClick={() => {
                  onChange(opcion.value);
                  setAbierto(false);
                }}
              >
                <span>{opcion.label}</span>
                {opcion.value === value && (
                  <svg viewBox="0 0 24 24" width="16" height="16" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
