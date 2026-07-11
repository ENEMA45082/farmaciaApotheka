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
            <span>San Jerónimo 248 Loc. 3-4, X5000AGF Córdoba</span>
          </div>

          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <a href="tel:+543518354942">+54 351 835-4942</a>
          </div>

          <div className="footer__contact-item">
            <svg viewBox="0 0 24 24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <a href="mailto:farmaciaapotheka.srl@gmail.com">farmaciaapotheka.srl@gmail.com</a>
          </div>
        </div>

      </div>

      <p className="footer__copy">
        © {new Date().getFullYear()} Farmacia Apotheka S.A. Todos los derechos reservados.
      </p>
    </footer>
  );
}
