import axios from 'axios';
import type { BannerPromo, CrearBannerPromoDTO, ActualizarBannerPromoDTO } from '../types';
import { supabase } from '../lib/supabase';
import { addErrorInterceptor } from './apiClient';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

api.interceptors.request.use(async config => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

addErrorInterceptor(api);

export async function fetchBannersPromo(): Promise<BannerPromo[]> {
  const { data } = await api.get<BannerPromo[]>('/banners-promo');
  return data;
}

// Solo para el panel de admin: incluye banners inactivos. La home usa
// fetchBannersPromo(), que siempre filtra por activo en el backend.
export async function fetchBannersPromoAdmin(): Promise<BannerPromo[]> {
  const { data } = await api.get<BannerPromo[]>('/banners-promo/admin');
  return data;
}

export async function crearBannerPromo(dto: CrearBannerPromoDTO): Promise<BannerPromo> {
  const { data } = await api.post<BannerPromo>('/banners-promo', dto);
  return data;
}

export async function actualizarBannerPromo(id: string, dto: ActualizarBannerPromoDTO): Promise<BannerPromo> {
  const { data } = await api.put<BannerPromo>(`/banners-promo/${id}`, dto);
  return data;
}

export async function eliminarBannerPromo(id: string): Promise<void> {
  await api.delete(`/banners-promo/${id}`);
}
