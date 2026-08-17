import axios from 'axios';
import type {
  SaldoPuntos,
  Premio,
  CrearPremioDTO,
  ActualizarPremioDTO,
  CanjePremio,
  CanjePremioConDetalle,
} from '../types';
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

export async function fetchMisPuntos(): Promise<SaldoPuntos> {
  const { data } = await api.get<SaldoPuntos>('/puntos');
  return data;
}

export async function fetchCatalogoPremios(): Promise<Premio[]> {
  const { data } = await api.get<Premio[]>('/puntos/catalogo');
  return data;
}

export async function canjearPremio(premioId: string): Promise<CanjePremio> {
  const { data } = await api.post<CanjePremio>('/puntos/canjear', { premio_id: premioId });
  return data;
}

export async function crearPremio(dto: CrearPremioDTO): Promise<Premio> {
  const { data } = await api.post<Premio>('/puntos/premios', dto);
  return data;
}

export async function listarPremiosAdmin(): Promise<Premio[]> {
  const { data } = await api.get<Premio[]>('/puntos/premios/admin');
  return data;
}

export async function actualizarPremio(id: string, dto: ActualizarPremioDTO): Promise<Premio> {
  const { data } = await api.patch<Premio>(`/puntos/premios/${id}`, dto);
  return data;
}

export async function listarCanjesAdmin(): Promise<CanjePremioConDetalle[]> {
  const { data } = await api.get<CanjePremioConDetalle[]>('/puntos/canjes/admin');
  return data;
}
