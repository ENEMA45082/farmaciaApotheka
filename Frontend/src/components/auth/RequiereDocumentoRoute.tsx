import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchPerfil } from '../../api/perfil.api';
import { Spinner } from '../ui/Spinner';
import type { Perfil } from '../../types';

// Bloquea el checkout (rutas /envio y /pagar) si el usuario todavía no cargó
// su DNI/CUIT en "Mi Perfil" — la facturación electrónica SIEMPRE necesita un
// documento real del comprador, nunca Consumidor Final genérico.
export function RequiereDocumentoRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!user) { setCargando(false); return; }
    fetchPerfil()
      .then(setPerfil)
      .catch(() => setPerfil(null))
      .finally(() => setCargando(false));
  }, [user]);

  if (authLoading || cargando) return <Spinner />;
  // Sin sesión: se deja pasar. EnvioPage/PagarPage ya redirigen a /login por su
  // cuenta (preservando el "next" de vuelta al checkout) — duplicarlo acá con
  // un <Navigate> genérico pisaría ese comportamiento.
  if (!user) return <>{children}</>;
  if (!perfil?.dni?.trim()) return <Navigate to="/perfil?motivo=documento-requerido" replace />;

  return <>{children}</>;
}
