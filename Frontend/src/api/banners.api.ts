import axios from 'axios';
import type { Banner, CrearBannerDTO, ActualizarBannerDTO } from '../types';
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

export async function fetchBanners(): Promise<Banner[]> {
  const { data } = await api.get<Banner[]>('/banners');
  return data;
}

// Solo para el panel de admin: incluye banners inactivos. El carrusel
// público (HeroCarousel) usa fetchBanners(), que siempre filtra por activo
// en el backend sin importar si quien mira tiene sesión de admin abierta.
export async function fetchBannersAdmin(): Promise<Banner[]> {
  const { data } = await api.get<Banner[]>('/banners/admin');
  return data;
}

export async function crearBanner(dto: CrearBannerDTO): Promise<Banner> {
  const { data } = await api.post<Banner>('/banners', dto);
  return data;
}

export async function actualizarBanner(id: string, dto: ActualizarBannerDTO): Promise<Banner> {
  const { data } = await api.put<Banner>(`/banners/${id}`, dto);
  return data;
}

export async function eliminarBanner(id: string): Promise<void> {
  await api.delete(`/banners/${id}`);
}
