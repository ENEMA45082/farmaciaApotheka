import type { Variants } from 'framer-motion';

// Hub central de variantes de animación — Framer Motion
// Paleta Apotheka: navy #002D62, verde #88D8C0
// Todas las animaciones usan GPU-accelerated: opacity, x/y (translate), scale

// ── Page transitions ─────────────────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
};

// ── Stagger — grids, listas ───────────────────────────────────────────────────
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: 'easeIn' } },
};

// ── Cart drawer + overlay ─────────────────────────────────────────────────────
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

export const drawerVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit:    { x: '100%', transition: { duration: 0.2, ease: 'easeIn' } },
};

// ── Menús desplegables ────────────────────────────────────────────────────────
export const menuVariants: Variants = {
  initial: { opacity: 0, scaleY: 0.92, y: -6 },
  animate: { opacity: 1, scaleY: 1,    y: 0,  transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, scaleY: 0.95, y: -4, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const megaMenuVariants: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
};

// ── Micro-interacciones ────────────────────────────────────────────────────────
export const heartVariants: Variants = {
  active:   { scale: [1, 1.35, 0.9, 1.1, 1], transition: { duration: 0.4 } },
  inactive: { scale: 1 },
};

// ── Toast ──────────────────────────────────────────────────────────────────────
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.15, ease: 'easeIn' } },
};

// Spring preset compartido
export const spring = { type: 'spring', stiffness: 300, damping: 28 } as const;
