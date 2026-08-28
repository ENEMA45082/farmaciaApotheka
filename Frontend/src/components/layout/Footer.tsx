import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { NEGOCIO } from '../../config/negocio';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">

        <div className="footer__col footer__brand">
          <span className="footer__logo-name">Apotheka</span>
          <span className="footer__logo-sub">FARMACIA</span>
          <p className="footer__brand-desc">
            Tu farmacia de confianza en el corazón de Córdoba.
          </p>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">
            <svg viewBox="0 0 24 24">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Dirección
          </h3>
          <div className="footer__contact-item">
            <span>{NEGOCIO.direccion.completa}</span>
          </div>
          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            <Link to="/contacto">Cómo llegar</Link>
          </div>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">Contacto</h3>
          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <a href={NEGOCIO.telefono.telHref}>{NEGOCIO.telefono.display}</a>
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
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Horarios
          </h3>
          <ul className="footer__horarios">
            {NEGOCIO.horarios.map(h => (
              <li key={h.dias}>
                <span>{h.dias}</span>
                <span>{h.horario}</span>
              </li>
            ))}
          </ul>
        </div>

        <hr className="footer__divider" />

        <p className="footer__copy">
          © {new Date().getFullYear()} Farmacia Apotheka S.A. Todos los derechos reservados.
        </p>

        <p className="footer__legal">
          Las fotos son a modo ilustrativo. La venta de los productos publicados está sujeta a la verificación de stock.
        </p>

        <p className="footer__trust">
          <ShieldCheck size={16} aria-hidden="true" />
          Gracias por elegirnos todos los días
        </p>

        <div className="footer__sellos">
          {/* Código provisto por AFIP/ARCA para el régimen Data Fiscal (F960/D) — no
              modificar las URLs, son las que AFIP valida para mostrar el sello. */}
          <a href="http://qr.afip.gob.ar/?qr=oOYxv5DMWgKL4pjJNmzmlA,," target="_F960AFIPInfo" rel="noopener noreferrer">
            <img src="http://www.afip.gob.ar/images/f960/DATAWEB.jpg" alt="Data Fiscal AFIP" />
          </a>
        </div>

      </div>
    </footer>
  );
}
