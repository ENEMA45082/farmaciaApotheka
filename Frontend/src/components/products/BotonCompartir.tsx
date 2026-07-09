import { useState } from 'react';

interface Props {
  nombre: string;
}

function IconoCompartir() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function BotonCompartir({ nombre }: Props) {
  const [copiado, setCopiado] = useState(false);

  const puedeCompartirNativo = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function handleCompartirNativo() {
    try {
      await navigator.share({ title: nombre, url: window.location.href });
    } catch {
      // el usuario canceló el share sheet, no hacemos nada
    }
  }

  async function handleCopiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard no disponible, no hacemos nada
    }
  }

  if (puedeCompartirNativo) {
    return (
      <button type="button" className="btn btn--ghost btn--con-icono" onClick={handleCompartirNativo}>
        <IconoCompartir />
        Compartir
      </button>
    );
  }

  const textoWhatsapp = encodeURIComponent(`${nombre} ${window.location.href}`);

  return (
    <div className="compartir-opciones">
      <a
        className="btn btn--ghost"
        href={`https://wa.me/?text=${textoWhatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp
      </a>
      <button type="button" className="btn btn--ghost" onClick={handleCopiarLink}>
        {copiado ? '¡Copiado!' : 'Copiar link'}
      </button>
    </div>
  );
}
