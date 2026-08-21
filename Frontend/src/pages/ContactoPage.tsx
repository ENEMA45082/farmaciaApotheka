import type { ReactNode } from 'react';
import { NEGOCIO, getGoogleMapsEmbedUrl, getWhatsappUrl } from '../config/negocio';
import { Card } from '../components/ui/card';

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-verde">{label}</h2>
      {children}
    </div>
  );
}

export function ContactoPage() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        <h1 className="text-2xl font-extrabold text-navy">Contacto</h1>
        <p className="mt-2 mb-8 max-w-xl text-sm leading-relaxed text-muted">
          Estamos en pleno Centro de Córdoba, a metros de la peatonal. Vení a visitarnos
          o escribinos por WhatsApp, te ayudamos con lo que necesites.
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card className="flex flex-col gap-5 p-6">
            <InfoItem label="Dirección">
              <address className="text-sm not-italic text-ink">{NEGOCIO.direccion.completa}</address>
            </InfoItem>

            <InfoItem label="Teléfono">
              <a href={NEGOCIO.telefono.telHref} className="inline-block py-1 text-sm text-ink hover:text-navy hover:underline">
                {NEGOCIO.telefono.display}
              </a>
            </InfoItem>

            <InfoItem label="Email">
              <a href={`mailto:${NEGOCIO.email}`} className="inline-block py-1 text-sm text-ink hover:text-navy hover:underline">
                {NEGOCIO.email}
              </a>
            </InfoItem>

            <InfoItem label="Instagram">
              <a
                href={NEGOCIO.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block py-1 text-sm text-ink hover:text-navy hover:underline"
              >
                @farmacia.apotheka
              </a>
            </InfoItem>

            <InfoItem label="Horarios">
              <ul className="flex flex-col gap-1">
                {NEGOCIO.horarios.map(h => (
                  <li key={h.dias} className="flex max-w-xs justify-between gap-4 text-sm text-ink">
                    <span>{h.dias}</span>
                    <span>{h.horario}</span>
                  </li>
                ))}
              </ul>
            </InfoItem>

            <a
              href={getWhatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 self-start rounded-md bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5a]"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none">
                <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.88 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.84 1h.01a7.94 7.94 0 0 0 5.55-13.58z"/>
                <path d="M9.5 8.2c.15-.34.31-.34.46-.35h.4c.13 0 .3-.05.47.36.17.4.58 1.42.63 1.52.05.1.09.22.02.36-.07.14-.11.22-.22.34l-.3.36c-.11.11-.23.23-.1.45.13.22.57.94 1.23 1.53.85.75 1.55 1 1.79 1.11.24.11.37.09.5-.06.14-.15.6-.7.76-.94.16-.24.32-.2.53-.12.22.08 1.38.65 1.62.77.24.12.4.18.46.28.06.1.06.58-.14 1.14-.2.56-1.16 1.1-1.6 1.14-.44.04-.85.19-2.85-.6-2.4-.96-3.9-3.33-4.02-3.48-.11-.15-.94-1.25-.94-2.38 0-1.13.6-1.68.81-1.91z"/>
              </svg>
              Chatear por WhatsApp
            </a>
          </Card>

          <div className="relative h-80 overflow-hidden rounded-xl border border-line shadow-sm md:h-[420px]">
            <iframe
              src={getGoogleMapsEmbedUrl()}
              loading="lazy"
              title="Ubicación de Farmacia Apotheka en el mapa"
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block' }}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
