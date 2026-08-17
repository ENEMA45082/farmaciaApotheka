import { motion } from 'framer-motion';
import type { Premio } from '../../types';
import { PremioCard } from './PremioCard';
import { Spinner } from '../ui/Spinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { staggerContainer } from '../ui/motion';

interface Props {
  premios: Premio[];
  cargando: boolean;
  error: string | null;
  saldo: number;
  canjeandoId: string | null;
  onCanjear: (premio: Premio) => void;
}

export function PremioGrid({ premios, cargando, error, saldo, canjeandoId, onCanjear }: Props) {
  if (cargando) return <Spinner />;
  if (error)    return <ErrorMessage message={error} />;
  if (premios.length === 0) {
    return <p className="empty-state">Todavía no hay premios disponibles para canjear.</p>;
  }

  return (
    <motion.div
      className="product-grid"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {premios.map(p => (
        <PremioCard key={p.id} premio={p} saldo={saldo} canjeando={canjeandoId === p.id} onCanjear={onCanjear} />
      ))}
    </motion.div>
  );
}
