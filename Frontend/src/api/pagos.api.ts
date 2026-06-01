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

export async function iniciarCheckoutHosted(pedidoId: string): Promise<{ checkoutUrl: string }> {
  const { data } = await api.post<{ checkoutUrl: string }>('/pagos/checkout', { pedidoId });
  return data;
}

export async function procesarPago(payload: {
  pedidoId: string;
  token: string;
  bin: string;
  cuotas: number;
  paymentMethodId: number;
}): Promise<{ success: boolean; pedidoId: string; pw_payment_id?: string }> {
  const { data } = await api.post('/pagos/pagar', payload);
  return data;
}
