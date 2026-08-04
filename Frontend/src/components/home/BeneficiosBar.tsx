import { Truck, ShieldCheck, MessageCircle, BadgeCheck } from 'lucide-react';

const BENEFICIOS = [
  { Icono: Truck,         titulo: 'Envíos rápidos',         subtitulo: 'en Córdoba' },
  { Icono: ShieldCheck,   titulo: 'Compra segura',          subtitulo: 'y protegida' },
  { Icono: MessageCircle, titulo: 'Atención personalizada', subtitulo: 'por WhatsApp' },
  { Icono: BadgeCheck,    titulo: 'Calidad garantizada',    subtitulo: 'en cada producto' },
];

export function BeneficiosBar() {
  return (
    <div className="beneficios-bar">
      {BENEFICIOS.map(({ Icono, titulo, subtitulo }) => (
        <div className="beneficios-bar__item" key={titulo}>
          <Icono className="beneficios-bar__icon" size={26} strokeWidth={1.75} aria-hidden="true" />
          <div className="beneficios-bar__text">
            <strong>{titulo}</strong>
            <span>{subtitulo}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
