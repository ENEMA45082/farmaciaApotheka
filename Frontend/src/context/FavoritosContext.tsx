import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { fetchFavoritos, toggleFavorito as apiToggle } from '../api/favoritos.api';
import { toastBus } from '../utils/toastBus';

interface FavoritosContextValue {
  favoritoIds: Set<string>;
  esFavorito: (id: string) => boolean;
  toggleFavorito: (id: string) => Promise<void>;
}

const FavoritosContext = createContext<FavoritosContextValue | null>(null);

export function FavoritosProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [favoritoIds, setFavoritoIds] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    if (!userId) { setFavoritoIds(new Set()); return; }
    try {
      const ids = await fetchFavoritos();
      setFavoritoIds(new Set(ids));
    } catch {
      setFavoritoIds(new Set());
    }
  }, [userId]);

  useEffect(() => { cargar(); }, [cargar]);

  const esFavorito = (id: string) => favoritoIds.has(id);

  const toggleFavorito = async (id: string) => {
    if (!user) { navigate('/login'); return; }
    // optimistic update
    setFavoritoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    try {
      const { favorito } = await apiToggle(id);
      setFavoritoIds(prev => {
        const next = new Set(prev);
        if (favorito) next.add(id); else next.delete(id);
        return next;
      });
      toastBus.emit(favorito ? 'Se agregó a favoritos' : 'Se quitó de favoritos');
    } catch {
      // revertir si falla
      cargar();
    }
  };

  return (
    <FavoritosContext.Provider value={{ favoritoIds, esFavorito, toggleFavorito }}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritos() {
  const ctx = useContext(FavoritosContext);
  if (!ctx) throw new Error('useFavoritos debe usarse dentro de FavoritosProvider');
  return ctx;
}
