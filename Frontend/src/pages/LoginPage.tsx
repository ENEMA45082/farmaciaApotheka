import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { staggerContainer, staggerItem } from '../components/ui/motion';
import { Card } from '../components/ui/card';

// Nombres cortos usados por los redirects a /login?next=... antes de llegar acá
// (EnvioPage, PagarPage, CartSummary). Cualquier otro valor se trata como un
// path propio (ver resolverDestino) — nunca una URL externa, para no abrir la
// puerta a un open redirect.
const DESTINOS_NEXT: Record<string, string> = {
  checkout: '/envio',
  envio:    '/envio',
  pagar:    '/pagar',
};

function resolverDestino(next: string | null): string {
  if (!next) return '/';
  if (DESTINOS_NEXT[next]) return DESTINOS_NEXT[next];
  // Path relativo propio (p.ej. lo que manda LoginPromptBanner con la página
  // actual) — solo si empieza con "/" y no "//" (protocol-relative a otro host).
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return '/';
}

export function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!loading && user) {
      navigate(resolverDestino(searchParams.get('next')), { replace: true });
    }
  }, [user, loading, navigate, searchParams]);

  function handleGoogleLogin() {
    signInWithGoogle();
  }

  if (loading) return null;

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-page px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <Card className="p-8 text-center shadow-lg">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div className="mb-6" variants={staggerItem}>
              <span className="block text-2xl font-extrabold tracking-tight text-navy">Apotheka</span>
              <span className="block text-[0.7rem] font-semibold tracking-[3px] text-muted">FARMACIA</span>
            </motion.div>

            <motion.h1 className="mb-2 text-xl font-bold text-navy" variants={staggerItem}>
              Iniciar sesión
            </motion.h1>

            <motion.p className="mb-7 text-sm text-muted" variants={staggerItem}>
              Ingresá a tu cuenta para continuar con tu compra.
            </motion.p>

            <motion.button
              className="mb-5 flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-navy transition-colors hover:bg-page"
              onClick={handleGoogleLogin}
              variants={staggerItem}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="shrink-0" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </motion.button>

            <motion.p className="text-xs leading-relaxed text-muted" variants={staggerItem}>
              Al continuar, aceptás nuestros{' '}
              <Link to="/terminos" className="text-navy underline underline-offset-2">
                términos de uso
              </Link>{' '}
              y{' '}
              <Link to="/privacidad" className="text-navy underline underline-offset-2">
                política de privacidad
              </Link>
              .
            </motion.p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
