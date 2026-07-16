import { Link } from 'react-router-dom';
import { NEGOCIO } from '../../config/negocio';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">

        <div className="footer__brand">
          <span className="footer__logo-name">Apotheka</span>
          <span className="footer__logo-sub">FARMACIA</span>
          <p className="footer__brand-desc">
            Tu farmacia de confianza en el corazón de Córdoba.
          </p>
        </div>

        <div className="footer__contact">
          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{NEGOCIO.direccion.completa}</span>
          </div>

          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <a href={NEGOCIO.telefono.telHref}>{NEGOCIO.telefono.display}</a>
          </div>

          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.88 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.84 1h.01a7.94 7.94 0 0 0 5.55-13.58z"/>
              <path d="M9.5 8.2c.15-.34.31-.34.46-.35h.4c.13 0 .3-.05.47.36.17.4.58 1.42.63 1.52.05.1.09.22.02.36-.07.14-.11.22-.22.34l-.3.36c-.11.11-.23.23-.1.45.13.22.57.94 1.23 1.53.85.75 1.55 1 1.79 1.11.24.11.37.09.5-.06.14-.15.6-.7.76-.94.16-.24.32-.2.53-.12.22.08 1.38.65 1.62.77.24.12.4.18.46.28.06.1.06.58-.14 1.14-.2.56-1.16 1.1-1.6 1.14-.44.04-.85.19-2.85-.6-2.4-.96-3.9-3.33-4.02-3.48-.11-.15-.94-1.25-.94-2.38 0-1.13.6-1.68.81-1.91z"/>
            </svg>
            <a href={NEGOCIO.whatsapp.url} target="_blank" rel="noopener noreferrer">
              Escribinos por WhatsApp
            </a>
          </div>

          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Lun a Vie 8:30–19:00 · Sáb 10:00–13:30 · Dom cerrado</span>
          </div>

          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <a href={`mailto:${NEGOCIO.email}`}>{NEGOCIO.email}</a>
          </div>

          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
            <a href={NEGOCIO.instagram} target="_blank" rel="noopener noreferrer">
              @farmacia.apotheka
            </a>
          </div>

          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            <Link to="/contacto">Cómo llegar y horarios</Link>
          </div>
        </div>

      </div>

      <p className="footer__copy">
        © {new Date().getFullYear()} Farmacia Apotheka S.A. Todos los derechos reservados.
      </p>
    </footer>
  );
}
