import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CarritoProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { CheckoutProvider } from './context/CheckoutContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { WhatsAppButton } from './components/ui/WhatsAppButton';
import { Spinner } from './components/ui/Spinner';
import { HomePage } from './pages/HomePage';
import { FavoritosProvider } from './context/FavoritosContext';
import { ErrorModalProvider } from './context/ErrorModalContext';
import { ToastProvider } from './context/ToastContext';
import { AdminRoute } from './components/auth/AdminRoute';
import { RequiereDocumentoRoute } from './components/auth/RequiereDocumentoRoute';
import { pageVariants } from './components/ui/motion';
import './index.css';

// Named exports en todo el proyecto (no default) -> React.lazy necesita el
// wrapper .then(m => ({ default: m.X })). Todas las páginas menos HomePage
// (ruta de entrada más común, se mantiene eager para no meter un round-trip
// de Suspense en el primer paint).
const ProductDetailPage  = lazy(() => import('./pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const AdminPage          = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const LoginPage          = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const EstadisticasPage   = lazy(() => import('./pages/EstadisticasPage').then(m => ({ default: m.EstadisticasPage })));
const PerfilPage         = lazy(() => import('./pages/PerfilPage').then(m => ({ default: m.PerfilPage })));
const PedidosPage        = lazy(() => import('./pages/PedidosPage').then(m => ({ default: m.PedidosPage })));
const DetallePedidoPage  = lazy(() => import('./pages/DetallePedidoPage').then(m => ({ default: m.DetallePedidoPage })));
const DireccionesPage    = lazy(() => import('./pages/DireccionesPage').then(m => ({ default: m.DireccionesPage })));
const OfertasPage        = lazy(() => import('./pages/OfertasPage').then(m => ({ default: m.OfertasPage })));
const ContactoPage       = lazy(() => import('./pages/ContactoPage').then(m => ({ default: m.ContactoPage })));
const FavoritosPage      = lazy(() => import('./pages/FavoritosPage').then(m => ({ default: m.FavoritosPage })));
const EnvioPage          = lazy(() => import('./pages/EnvioPage').then(m => ({ default: m.EnvioPage })));
const PagarPage          = lazy(() => import('./pages/PagarPage').then(m => ({ default: m.PagarPage })));
const PagoResultadoPage  = lazy(() => import('./pages/PagoResultadoPage').then(m => ({ default: m.PagoResultadoPage })));

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <Suspense fallback={<Spinner />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/productos/:id" element={<ProductDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/pedidos/:id" element={<DetallePedidoPage />} />
            <Route path="/direcciones" element={<DireccionesPage />} />
            <Route path="/ofertas" element={<OfertasPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="/favoritos" element={<FavoritosPage />} />
            <Route path="/checkout" element={<Navigate to="/envio" replace />} />
            <Route path="/envio" element={<RequiereDocumentoRoute><EnvioPage /></RequiereDocumentoRoute>} />
            <Route path="/pagar" element={<RequiereDocumentoRoute><PagarPage /></RequiereDocumentoRoute>} />
            <Route path="/pago/:resultado" element={<PagoResultadoPage />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route
              path="/estadisticas"
              element={
                <AdminRoute>
                  <EstadisticasPage />
                </AdminRoute>
              }
            />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AuthProvider>
      <ErrorModalProvider>
        <ToastProvider>
          <CarritoProvider>
            <BrowserRouter>
              <CheckoutProvider>
                <FavoritosProvider>
                  <Header />
                  <CartDrawer />
                  <main className="main-content">
                    <AnimatedRoutes />
                  </main>
                  <Footer />
                  <WhatsAppButton />
                </FavoritosProvider>
              </CheckoutProvider>
            </BrowserRouter>
          </CarritoProvider>
        </ToastProvider>
      </ErrorModalProvider>
    </AuthProvider>
  );
}

export default App;
