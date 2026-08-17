import { useState, useEffect, useCallback } from 'react';
import { fetchBannersAdmin } from '../api/banners.api';
import type { Banner } from '../types';

// Usado solo por AdminCarteleriaPage: trae también los banners inactivos
// para poder listarlos/reactivarlos. El carrusel público no usa este hook.
export function useBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    fetchBannersAdmin()
      .then(setBanners)
      .catch(() => setError('Error al cargar los banners'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { banners, cargando, error, recargar: cargar };
}
