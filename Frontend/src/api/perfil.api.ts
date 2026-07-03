import axios from 'axios';
import { supabase } from '../lib/supabase';
import type { Perfil, ActualizarPerfilDTO } from '../types';
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

export async function fetchPerfil(): Promise<Perfil> {
  const { data } = await api.get<Perfil>('/perfil');
  return data;
}

export async function actualizarPerfil(dto: ActualizarPerfilDTO): Promise<Perfil> {
  const { data } = await api.put<Perfil>('/perfil', dto);
  return data;
}
