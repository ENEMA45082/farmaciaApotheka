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
