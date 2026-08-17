import { Link } from 'react-router-dom';
import { Package, Tags, Image, ClipboardList, FileSpreadsheet, FileWarning, Ticket, Award } from 'lucide-react';
import { AdminLayout } from '../components/admin/AdminLayout';

const SECCIONES = [
  { path: '/admin/productos',        icon: Package,        title: 'Productos',                 desc: 'Alta, edición y stock de productos.' },
  { path: '/admin/categorias',       icon: Tags,            title: 'Categorías',                 desc: 'Organizá las categorías de la tienda.' },
  { path: '/admin/carteleria',       icon: Image,           title: 'Cartelería',                 desc: 'Banners del carrusel de la home.' },
  { path: '/admin/pedidos',          icon: ClipboardList,   title: 'Pedidos',                    desc: 'Seguimiento y cambio de estado de pedidos.' },
  { path: '/admin/cupones',          icon: Ticket,          title: 'Cupones',                    desc: 'Códigos de descuento y sus límites de uso.' },
  { path: '/admin/puntos',           icon: Award,           title: 'Puntos',                     desc: 'Catálogo de premios y canjes de clientes.' },
  { path: '/admin/importar-precios', icon: FileSpreadsheet, title: 'Importar precios',           desc: 'Actualización masiva de precios por CSV.' },
  { path: '/admin/facturas',         icon: FileWarning,     title: 'Facturas con problemas',     desc: 'Facturas ARCA que fallaron al emitirse.' },
];

export function AdminPage() {
  return (
    <AdminLayout>
      <div className="admin-landing-grid">
        {SECCIONES.map(s => (
          <Link key={s.path} to={s.path} className="admin-landing-card">
            <s.icon size={28} strokeWidth={1.75} />
            <h2>{s.title}</h2>
            <p>{s.desc}</p>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
