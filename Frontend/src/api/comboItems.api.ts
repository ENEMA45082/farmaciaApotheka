import axios from 'axios';
import type { ComboItem, CrearComboItemDTO, ActualizarComboItemDTO } from '../types';
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

export async function fetchComboItems(comboId: string): Promise<ComboItem[]> {
  const { data } = await api.get<ComboItem[]>('/combo-items', { params: { combo_id: comboId } });
  return data;
}

export async function agregarComboItem(dto: CrearComboItemDTO): Promise<ComboItem> {
  const { data } = await api.post<ComboItem>('/combo-items', dto);
  return data;
}

export async function actualizarComboItem(id: string, dto: ActualizarComboItemDTO): Promise<ComboItem> {
  const { data } = await api.put<ComboItem>(`/combo-items/${id}`, dto);
  return data;
}

export async function eliminarComboItem(id: string): Promise<void> {
  await api.delete(`/combo-items/${id}`);
}
