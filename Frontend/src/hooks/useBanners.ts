import { useState, useEffect, useCallback } from 'react';
import { fetchBanners } from '../api/banners.api';
import type { Banner } from '../types';

export function useBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    fetchBanners()
      .then(setBanners)
      .catch(() => setError('Error al cargar los banners'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { banners, cargando, error, recargar: cargar };
}
