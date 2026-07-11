import axios from 'axios';
import { supabase } from '../lib/supabase';
import type { FacturaConProblema } from '../types';
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

export async function fetchFacturasConProblemas(): Promise<FacturaConProblema[]> {
  const { data } = await api.get<FacturaConProblema[]>('/facturas/admin/errores');
  return data;
}
