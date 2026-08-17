import axios from 'axios';
import type { ProductoDestacado, CrearProductoDestacadoDTO, ActualizarProductoDestacadoDTO } from '../types';
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

export async function fetchProductosDestacados(): Promise<ProductoDestacado[]> {
  const { data } = await api.get<ProductoDestacado[]>('/productos-destacados');
  return data;
}

export async function agregarProductoDestacado(dto: CrearProductoDestacadoDTO): Promise<ProductoDestacado> {
  const { data } = await api.post<ProductoDestacado>('/productos-destacados', dto);
  return data;
}

export async function actualizarProductoDestacado(id: string, dto: ActualizarProductoDestacadoDTO): Promise<ProductoDestacado> {
  const { data } = await api.put<ProductoDestacado>(`/productos-destacados/${id}`, dto);
  return data;
}

export async function eliminarProductoDestacado(id: string): Promise<void> {
  await api.delete(`/productos-destacados/${id}`);
}
