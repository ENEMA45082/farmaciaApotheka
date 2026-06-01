import axios from 'axios';
import { supabase } from '../lib/supabase';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

api.interceptors.request.use(async config => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

export async function fetchFavoritos(): Promise<string[]> {
  const { data } = await api.get<string[]>('/favoritos');
  return data;
}

export async function toggleFavorito(productoId: string): Promise<{ favorito: boolean }> {
  const { data } = await api.post<{ favorito: boolean }>(`/favoritos/${productoId}`);
  return data;
}
