import { motion } from 'framer-motion';
import { toastVariants } from './motion';

interface Props {
  message: string;
}

export function Toast({ message }: Props) {
  return (
    <motion.div
      className="toast"
      role="status"
      aria-live="polite"
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {message}
    </motion.div>
  );
}
