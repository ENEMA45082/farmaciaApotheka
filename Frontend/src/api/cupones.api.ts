import axios from 'axios';
import type { CuponConUsos, CrearCuponDTO, ActualizarCuponDTO, ResultadoValidacionCupon } from '../types';
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

export async function validarCupon(
  codigo: string,
  itemsCarrito: { producto_id: string; cantidad: number }[],
): Promise<ResultadoValidacionCupon> {
  const { data } = await api.post<ResultadoValidacionCupon>('/cupones/validar', { codigo, itemsCarrito });
  return data;
}

export async function crearCupon(dto: CrearCuponDTO): Promise<CuponConUsos> {
  const { data } = await api.post<CuponConUsos>('/cupones', dto);
  return data;
}

export async function listarCuponesAdmin(): Promise<CuponConUsos[]> {
  const { data } = await api.get<CuponConUsos[]>('/cupones/admin');
  return data;
}

export async function actualizarCupon(id: string, dto: ActualizarCuponDTO): Promise<CuponConUsos> {
  const { data } = await api.patch<CuponConUsos>(`/cupones/${id}`, dto);
  return data;
}
