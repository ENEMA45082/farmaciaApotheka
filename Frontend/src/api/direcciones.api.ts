import axios from 'axios';
import { supabase } from '../lib/supabase';
import type { Direccion, GuardarDireccionDTO } from '../types';
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

export async function fetchDireccion(): Promise<Direccion | null> {
  const { data } = await api.get<Direccion | null>('/direcciones');
  return data;
}

export async function guardarDireccion(dto: GuardarDireccionDTO): Promise<Direccion> {
  const { data } = await api.put<Direccion>('/direcciones', dto);
  return data;
}
