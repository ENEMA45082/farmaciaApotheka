import { motion } from 'framer-motion';
import type { Premio } from '../../types';
import { staggerItem } from '../ui/motion';

interface Props {
  premio: Premio;
  saldo: number;
  canjeando: boolean;
  onCanjear: (premio: Premio) => void;
}

export function PremioCard({ premio, saldo, canjeando, onCanjear }: Props) {
  const sinStock = premio.stock != null && premio.stock <= 0;
  const saldoInsuficiente = saldo < premio.costo_puntos;
  const disabled = sinStock || saldoInsuficiente || canjeando;

  return (
    <motion.div
      className="product-card"
      variants={staggerItem}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="product-card__image-wrap">
        <span className="oferta-badge oferta-badge--imagen">{premio.costo_puntos} pts</span>
        <img
          src={premio.imagen_url ?? '/placeholder.png'}
          alt={premio.nombre}
          className="product-card__image"
          width={400}
          height={180}
          loading="lazy"
        />
      </div>

      <div className="product-card__body">
        <h3 className="product-card__name">{premio.nombre}</h3>
        {premio.descripcion && <p className="premio-card__desc">{premio.descripcion}</p>}
        <p className="product-card__price">{premio.costo_puntos} pts</p>

        <button
          className="btn btn--primary"
          onClick={() => onCanjear(premio)}
          disabled={disabled}
        >
          {sinStock ? 'Sin stock' : saldoInsuficiente ? 'Puntos insuficientes' : canjeando ? 'Canjeando...' : 'Canjear'}
        </button>
      </div>
    </motion.div>
  );
}
