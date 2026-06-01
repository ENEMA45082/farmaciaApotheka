import axios from 'axios';
import { supabase } from '../lib/supabase';
import type { Pedido, CrearPedidoDTO } from '../types';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

api.interceptors.request.use(async config => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

export async function crearPedido(dto: CrearPedidoDTO): Promise<Pedido> {
  const { data } = await api.post<Pedido>('/pedidos', dto);
  return data;
}

export async function fetchMisPedidos(): Promise<Pedido[]> {
  const { data } = await api.get<Pedido[]>('/pedidos');
  return data;
}

export async function fetchPedidoPorId(id: string): Promise<Pedido> {
  const { data } = await api.get<Pedido>(`/pedidos/${id}`);
  return data;
}

export async function cancelarPedido(id: string): Promise<Pedido> {
  const { data } = await api.patch<Pedido>(`/pedidos/${id}/cancelar`);
  return data;
}

export async function fetchPedidosAdmin(): Promise<Pedido[]> {
  const { data } = await api.get<Pedido[]>('/pedidos/admin');
  return data;
}

export async function cambiarEstadoPedido(id: string, estado: string): Promise<Pedido> {
  const { data } = await api.patch<Pedido>(`/pedidos/${id}/estado`, { estado });
  return data;
}
