import axios from 'axios';
import { supabase } from '../lib/supabase';
import type { CotizacionEnvio, SucursalCorreoArgentino, ItemCarrito } from '../types';
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

export async function cotizarEnvio(
  items: ItemCarrito[],
  codigoPostal: string,
  metodo: 'domicilio' | 'retiro_sucursal',
): Promise<CotizacionEnvio> {
  const payload = {
    items: items.map(i => ({
      peso_gramos: i.producto.peso_gramos ?? 500,
      cantidad: i.cantidad,
    })),
    codigoPostal,
    metodo,
  };
  const { data } = await api.post<CotizacionEnvio>('/envio/cotizar', payload);
  return data;
}

export async function fetchSucursales(provinciaCodigo: string): Promise<SucursalCorreoArgentino[]> {
  const { data } = await api.get<SucursalCorreoArgentino[]>('/envio/sucursales', {
    params: { provinciaCodigo },
  });
  return data;
}
