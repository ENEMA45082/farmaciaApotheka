import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CarritoProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { CheckoutProvider } from './context/CheckoutContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { EstadisticasPage } from './pages/EstadisticasPage';
import { PerfilPage } from './pages/PerfilPage';
import { PedidosPage } from './pages/PedidosPage';
import { DetallePedidoPage } from './pages/DetallePedidoPage';
import { DireccionesPage } from './pages/DireccionesPage';
import { OfertasPage } from './pages/OfertasPage';
import { FavoritosPage } from './pages/FavoritosPage';
import { EnvioPage } from './pages/EnvioPage';
import { PagarPage } from './pages/PagarPage';
import { PagoResultadoPage } from './pages/PagoResultadoPage';
import { FavoritosProvider } from './context/FavoritosContext';
import { ErrorModalProvider } from './context/ErrorModalContext';
import { ToastProvider } from './context/ToastContext';
import { AdminRoute } from './components/auth/AdminRoute';
import { RequiereDocumentoRoute } from './components/auth/RequiereDocumentoRoute';
import { pageVariants } from './components/ui/motion';
import './index.css';

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
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/productos/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/pedidos/:id" element={<DetallePedidoPage />} />
          <Route path="/direcciones" element={<DireccionesPage />} />
          <Route path="/ofertas" element={<OfertasPage />} />
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
