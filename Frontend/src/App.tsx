import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import { AdminRoute } from './components/auth/AdminRoute';
import './index.css';

function CheckoutLayout() {
  return (
    <CheckoutProvider>
      <Outlet />
    </CheckoutProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <CarritoProvider>
        <BrowserRouter>
          <FavoritosProvider>
          <Header />
          <CartDrawer />
          <main className="main-content">
            <Routes>
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
              <Route element={<CheckoutLayout />}>
                <Route path="/envio" element={<EnvioPage />} />
                <Route path="/pagar" element={<PagarPage />} />
              </Route>
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
          </main>
          <Footer />
          </FavoritosProvider>
        </BrowserRouter>
      </CarritoProvider>
    </AuthProvider>
  );
}

export default App;
