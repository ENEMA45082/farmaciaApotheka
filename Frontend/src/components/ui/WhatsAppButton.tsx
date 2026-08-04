import { useLocation } from 'react-router-dom';
import { getWhatsappUrl } from '../../config/negocio';

const RUTAS_SIN_FAB = ['/envio', '/pagar'];

export function WhatsAppButton() {
  const { pathname } = useLocation();
  if (RUTAS_SIN_FAB.includes(pathname)) return null;

  return (
    <a
      className="whatsapp-fab"
      href={getWhatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatear con Farmacia Apotheka por WhatsApp"
    >
      <svg viewBox="0 0 24 24">
        <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.88 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.84 1h.01a7.94 7.94 0 0 0 5.55-13.58z"/>
        <path d="M9.5 8.2c.15-.34.31-.34.46-.35h.4c.13 0 .3-.05.47.36.17.4.58 1.42.63 1.52.05.1.09.22.02.36-.07.14-.11.22-.22.34l-.3.36c-.11.11-.23.23-.1.45.13.22.57.94 1.23 1.53.85.75 1.55 1 1.79 1.11.24.11.37.09.5-.06.14-.15.6-.7.76-.94.16-.24.32-.2.53-.12.22.08 1.38.65 1.62.77.24.12.4.18.46.28.06.1.06.58-.14 1.14-.2.56-1.16 1.1-1.6 1.14-.44.04-.85.19-2.85-.6-2.4-.96-3.9-3.33-4.02-3.48-.11-.15-.94-1.25-.94-2.38 0-1.13.6-1.68.81-1.91z"/>
      </svg>
    </a>
  );
}
