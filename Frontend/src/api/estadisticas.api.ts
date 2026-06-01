import axios from 'axios';
import { supabase } from '../lib/supabase';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export interface EstadisticasData {
  resumen: {
    totalProductos: number;
    totalStock: number;
    valorInventario: number;
    productosEnOferta: number;
    productosSinStock: number;
    proximosAVencer: number;
    totalCategorias: number;
    ahorroOferta: number;
  };
  porCategoria: Array<{
    nombre: string;
    totalProductos: number;
    totalStock: number;
    valorInventario: number;
  }>;
  distribucionPrecios: Array<{
    rango: string;
    cantidad: number;
  }>;
  vencimientosPorMes: Array<{
    mes: string;
    cantidad: number;
  }>;
  ofertaVsNormal: {
    enOferta: number;
    normal: number;
  };
  descuentoPromedio: number;
}

export async function fetchEstadisticas(): Promise<EstadisticasData> {
  const { data } = await api.get<EstadisticasData>('/estadisticas');
  return data;
}
