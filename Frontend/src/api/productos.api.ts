import axios from 'axios';
import type {
  ProductosPaginados,
  Producto,
  Categoria,
  CategoriasPaginadas,
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

export interface FiltrosCategoria {
  busqueda?: string;
  pagina?: number;
  limite?: number;
}

// Mismo endpoint que fetchCategorias — el paginado es opt-in en el backend:
// solo se activa si se manda alguno de estos filtros (ver categorias.controller.ts).
export async function fetchCategoriasPaginadas(filtros: FiltrosCategoria): Promise<CategoriasPaginadas> {
  const { data } = await api.get<CategoriasPaginadas>('/categorias', { params: filtros });
  return data;
}

let categoriasArbolCache: Promise<Categoria[]> | null = null;

export function fetchCategoriasArbol(): Promise<Categoria[]> {
  if (!categoriasArbolCache) {
    categoriasArbolCache = api.get<Categoria[]>('/categorias/arbol')
      .then(({ data }) => data)
      .catch((err) => {
        categoriasArbolCache = null;
        throw err;
      });
  }
  return categoriasArbolCache;
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
  // suppressGlobalError: EliminarCategoriaModal ya muestra el 409
  // ("tiene productos asociados") en su propio modal.
  await api.delete(`/categorias/${id}`, { suppressGlobalError: true });
}

export async function subirImagenes(archivos: File[]): Promise<string[]> {
  const formData = new FormData();
  archivos.forEach(archivo => formData.append('imagenes', archivo));
  const { data } = await api.post<{ urls: string[] }>('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.urls;
}

export interface CoincidenciaPrecio {
  producto_id: string;
  codigo_barras: string;
  nombre: string;
  nombre_csv: string;
  nombre_distinto: boolean;
  precio_actual: number;
  precio_nuevo: number;
  en_oferta: boolean;
  precio_oferta_actual: number | null;
  precio_oferta_nuevo: number | null;
}

export type MotivoSinCoincidencia = 'sin_codigo' | 'no_esta_en_csv' | 'duplicado_en_csv';

export interface ProductoSinCoincidencia {
  producto_id: string;
  codigo_barras: string | null;
  nombre: string;
  precio_actual: number;
  en_oferta: boolean;
  precio_oferta_actual: number | null;
  motivo: MotivoSinCoincidencia;
  precios_csv?: number[];
}

export interface ResumenImportarPrecios {
  filas_csv: number;
  sin_codigo: number;
  codigo_invalido: number;
  precio_invalido: number;
  mal_formadas: number;
  duplicados_ambiguos: number;
  con_cambio: number;
  sin_cambio: number;
  solo_en_csv: number;
  sin_coincidencia: number;
}

export interface PreviewImportarPreciosResponse {
  resumen: ResumenImportarPrecios;
  coincidencias: CoincidenciaPrecio[];
  sin_coincidencia: ProductoSinCoincidencia[];
}

export interface ItemAplicarPrecio {
  producto_id: string;
  precio_nuevo: number;
}

export interface ResultadoAplicarPrecios {
  actualizados: number;
  fallidos: { producto_id: string; razon: string }[];
}

// suppressGlobalError en las dos: la página y los modales muestran el error
// en el lugar (un archivo con columnas incorrectas, un producto que falló), y
// sin esto también aparecería el ErrorModal genérico con el mismo mensaje.
export async function previewImportarPrecios(
  archivo: File
): Promise<PreviewImportarPreciosResponse> {
  const formData = new FormData();
  formData.append('archivo', archivo);
  const { data } = await api.post<PreviewImportarPreciosResponse>(
    '/productos/preview-importar-precios',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, suppressGlobalError: true }
  );
  return data;
}

async function enviarLoteCambiosPrecio(
  items: ItemAplicarPrecio[]
): Promise<ResultadoAplicarPrecios> {
  const { data } = await api.post<ResultadoAplicarPrecios>(
    '/productos/aplicar-cambios-precio',
    { items },
    { suppressGlobalError: true }
  );
  return data;
}

const TAMANIO_LOTE_PRECIOS = 500;

export interface ResultadoAplicarPorLotes {
  aplicados: string[];
  fallidos: { producto_id: string; razon: string }[];
  // Si un lote falla entero (red, permisos) se corta ahí: lo que ya se aplicó
  // en lotes anteriores queda en `aplicados` y el resto no se intentó.
  errorGeneral: unknown | null;
}

// El backend acepta hasta 1000 items por request; se manda de a 500 para que
// aceptar miles de cambios de una vez no choque con ese tope.
export async function aplicarCambiosPrecio(
  items: ItemAplicarPrecio[]
): Promise<ResultadoAplicarPorLotes> {
  const aplicados: string[] = [];
  const fallidos: ResultadoAplicarPorLotes['fallidos'] = [];

  for (let i = 0; i < items.length; i += TAMANIO_LOTE_PRECIOS) {
    const lote = items.slice(i, i + TAMANIO_LOTE_PRECIOS);
    try {
      const resultado = await enviarLoteCambiosPrecio(lote);
      const idsFallidos = new Set(resultado.fallidos.map(f => f.producto_id));
      aplicados.push(...lote.filter(it => !idsFallidos.has(it.producto_id)).map(it => it.producto_id));
      fallidos.push(...resultado.fallidos);
    } catch (e) {
      return { aplicados, fallidos, errorGeneral: e };
    }
  }

  return { aplicados, fallidos, errorGeneral: null };
}
