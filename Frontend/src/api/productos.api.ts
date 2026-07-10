import axios from 'axios';
import type {
  ProductosPaginados,
  Producto,
  Categoria,
  CrearProductoDTO,
  ActualizarProductoDTO,
  CrearCategoriaDTO,
  ActualizarCategoriaDTO,
} from '../types';
import { supabase } from '../lib/supabase';
import { addErrorInterceptor } from './apiClient';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

api.interceptors.request.use(async (config) => {
  if (config.method && config.method.toLowerCase() !== 'get') {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }
  return config;
});

addErrorInterceptor(api);

export interface FiltrosProducto {
  categoria?: string;
  categorias?: string;
  busqueda?: string;
  codigo_barras?: string;
  en_oferta?: boolean;
  precio_min?: number;
  precio_max?: number;
  stock_min?: number;
  stock_max?: number;
  vencimiento_desde?: string;
  vencimiento_hasta?: string;
  pagina?: number;
  limite?: number;
  ordenar?: 'nombre_asc' | 'nombre_desc' | 'precio_asc' | 'precio_desc';
}

export async function fetchProductos(filtros: FiltrosProducto = {}): Promise<ProductosPaginados> {
  const { data } = await api.get<ProductosPaginados>('/productos', { params: filtros });
  return data;
}

export async function fetchProductoPorId(id: string): Promise<Producto> {
  const { data } = await api.get<Producto>(`/productos/${id}`);
  return data;
}

export async function crearProducto(dto: CrearProductoDTO): Promise<Producto> {
  const { data } = await api.post<Producto>('/productos', dto);
  return data;
}

export async function actualizarProducto(id: string, dto: ActualizarProductoDTO): Promise<Producto> {
  const { data } = await api.put<Producto>(`/productos/${id}`, dto);
  return data;
}

export async function eliminarProducto(id: string): Promise<void> {
  await api.delete(`/productos/${id}`);
}

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<Categoria[]>('/categorias');
  return data;
}

export async function fetchCategoriasArbol(): Promise<Categoria[]> {
  const { data } = await api.get<Categoria[]>('/categorias/arbol');
  return data;
}

export async function crearCategoria(dto: CrearCategoriaDTO): Promise<Categoria> {
  const { data } = await api.post<Categoria>('/categorias', dto);
  return data;
}

export async function actualizarCategoria(id: string, dto: ActualizarCategoriaDTO): Promise<Categoria> {
  const { data } = await api.put<Categoria>(`/categorias/${id}`, dto);
  return data;
}

export async function eliminarCategoria(id: string): Promise<void> {
  await api.delete(`/categorias/${id}`);
}

export async function subirImagenes(archivos: File[]): Promise<string[]> {
  const formData = new FormData();
  archivos.forEach(archivo => formData.append('imagenes', archivo));
  const { data } = await api.post<{ urls: string[] }>('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.urls;
}

export interface FilaPreviewPrecio {
  codigo_barras: string;
  nombre: string;
  precio_actual: number;
  precio_nuevo: number;
}

export interface FilaNoEncontrada {
  codigo_barras: string;
  precio_csv: number;
}

export interface PreviewImportarPreciosResponse {
  actualizaciones: FilaPreviewPrecio[];
  no_encontrados: FilaNoEncontrada[];
}

export interface ItemConfirmarPrecio {
  codigo_barras: string;
  precio_nuevo: number;
}

export interface ResultadoConfirmarPrecios {
  actualizados: number;
  fallidos: { codigo_barras: string; razon: string }[];
}

export async function previewImportarPrecios(
  archivo: File
): Promise<PreviewImportarPreciosResponse> {
  const formData = new FormData();
  formData.append('archivo', archivo);
  const { data } = await api.post<PreviewImportarPreciosResponse>(
    '/productos/preview-importar-precios',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function confirmarImportarPrecios(
  items: ItemConfirmarPrecio[]
): Promise<ResultadoConfirmarPrecios> {
  const { data } = await api.post<ResultadoConfirmarPrecios>(
    '/productos/confirmar-importar-precios',
    { items }
  );
  return data;
}
