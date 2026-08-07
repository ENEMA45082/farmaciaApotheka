import { Link } from 'react-router-dom';
import {
  Baby, Bone, Eye, FlaskConical, HeartPulse, Package, Pill, Sparkles, SprayCan, Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { useCategoriasArbol } from '../../hooks/useCategoriasArbol';
import { useCarruselScroll } from '../../hooks/useCarruselScroll';
import { slugify } from '../../utils/slug';

// No hay campo de ícono por categoría en el backend: se infiere por palabra
// clave sobre el nombre, con Package como ícono genérico de repuesto para
// categorías nuevas que no matcheen ninguna.
const ICONOS_POR_PALABRA_CLAVE: [RegExp, LucideIcon][] = [
  [/perfum|fragan/i, SprayCan],
  [/maquilla/i, Eye],
  [/personal|higiene/i, Sparkles],
  [/beb[eé]|matern/i, Baby],
  [/ortoped/i, Bone],
  [/suplement/i, Pill],
  [/elaboraci[oó]n/i, FlaskConical],
  [/equipamiento|m[eé]dic/i, Stethoscope],
  [/salud/i, HeartPulse],
];

function iconoParaCategoria(nombre: string): LucideIcon {
  return ICONOS_POR_PALABRA_CLAVE.find(([patron]) => patron.test(nombre))?.[1] ?? Package;
}

export function CategoriasMasVistas() {
  const { arbol, cargando } = useCategoriasArbol();
  const { trackRef, puedeIzq, puedeDer, actualizarFlechas, desplazar } = useCarruselScroll(arbol);

  if (cargando || arbol.length === 0) return null;

  return (
    <div className="categorias-vistas">
      <h2 className="categorias-vistas__titulo">Categorías más vistas</h2>
      <div className="categorias-vistas__wrap">
        <button
          type="button"
          className="categorias-vistas__arrow categorias-vistas__arrow--prev"
          aria-label="Categorías anteriores"
          onClick={() => desplazar(-1)}
          disabled={!puedeIzq}
        >
          ‹
        </button>

        <div className="categorias-vistas__track" ref={trackRef} onScroll={actualizarFlechas}>
          {arbol.map(categoria => {
            const Icono = iconoParaCategoria(categoria.nombre);
            return (
              <Link
                key={categoria.id}
                to={`/categoria/${slugify(categoria.nombre)}`}
                className="categorias-vistas__item"
              >
                <span className="categorias-vistas__circulo">
                  <Icono size={30} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="categorias-vistas__nombre">{categoria.nombre}</span>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          className="categorias-vistas__arrow categorias-vistas__arrow--next"
          aria-label="Categorías siguientes"
          onClick={() => desplazar(1)}
          disabled={!puedeDer}
        >
          ›
        </button>
      </div>
    </div>
  );
}
