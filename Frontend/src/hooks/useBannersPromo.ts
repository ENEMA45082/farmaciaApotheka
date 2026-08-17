import { useState, useEffect, useCallback } from 'react';
import { fetchBannersPromoAdmin } from '../api/bannersPromo.api';
import type { BannerPromo } from '../types';

// Usado solo por AdminCarteleriaPage: trae también los banners inactivos
// para poder listarlos/reactivarlos. La home no usa este hook.
export function useBannersPromo() {
  const [banners, setBanners] = useState<BannerPromo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    fetchBannersPromoAdmin()
      .then(setBanners)
      .catch(() => setError('Error al cargar los banners promocionales'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { banners, cargando, error, recargar: cargar };
}
