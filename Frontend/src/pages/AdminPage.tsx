import { Link } from 'react-router-dom';
import { Package, Tags, Image, ClipboardList, FileSpreadsheet, FileWarning, Ticket, Award, ArrowRight } from 'lucide-react';
import { AdminLayout } from '../components/admin/AdminLayout';

const SECCIONES = [
  { path: '/admin/productos',        icon: Package,        accent: 'blue',   title: 'Productos',             desc: 'Alta, edición y stock de productos.',        cta: 'Gestionar productos' },
  { path: '/admin/categorias',       icon: Tags,            accent: 'green',  title: 'Categorías',             desc: 'Organizá las categorías de la tienda.',      cta: 'Gestionar categorías' },
  { path: '/admin/carteleria',       icon: Image,           accent: 'violet', title: 'Cartelería',             desc: 'Banners del carrusel de la home.',           cta: 'Gestionar banners' },
  { path: '/admin/pedidos',          icon: ClipboardList,   accent: 'blue',   title: 'Pedidos',                desc: 'Seguimiento y cambio de estado de pedidos.', cta: 'Ver pedidos' },
  { path: '/admin/cupones',          icon: Ticket,          accent: 'amber',  title: 'Cupones',                desc: 'Códigos de descuento y sus límites de uso.', cta: 'Gestionar cupones' },
  { path: '/admin/puntos',           icon: Award,           accent: 'violet', title: 'Puntos',                 desc: 'Catálogo de premios y canjes de clientes.',  cta: 'Gestionar puntos' },
  { path: '/admin/importar-precios', icon: FileSpreadsheet, accent: 'green',  title: 'Importar precios',       desc: 'Actualización masiva de precios por CSV.',   cta: 'Importar CSV' },
  { path: '/admin/facturas',         icon: FileWarning,     accent: 'red',    title: 'Facturas con problemas', desc: 'Facturas ARCA que fallaron al emitirse.',    cta: 'Ver facturas' },
];

export function AdminPage() {
  return (
    <AdminLayout>
      <div className="admin-landing-grid">
        {SECCIONES.map(s => (
          <Link key={s.path} to={s.path} className="admin-landing-card">
            <span className={`admin-landing-card__icon admin-landing-card__icon--${s.accent}`}>
              <s.icon size={24} strokeWidth={1.75} />
            </span>
            <h2>{s.title}</h2>
            <p>{s.desc}</p>
            <span className={`admin-landing-card__cta admin-landing-card__cta--${s.accent}`}>
              {s.cta}
              <ArrowRight size={15} strokeWidth={2.25} />
            </span>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
