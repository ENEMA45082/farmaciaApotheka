import axios, { type AxiosInstance } from 'axios';
import { errorBus } from '../utils/errorBus';

declare module 'axios' {
  export interface AxiosRequestConfig {
    // Para requests cuyo caller ya muestra el error de forma específica
    // (ej. un modal propio para 409), así no aparece también el ErrorModal
    // genérico con el mismo mensaje.
    suppressGlobalError?: boolean;
  }
}

export function addErrorInterceptor(api: AxiosInstance): void {
  api.interceptors.response.use(
    res => res,
    err => {
      if (axios.isCancel(err)) return Promise.reject(err);
      if (err.response?.status === 401) return Promise.reject(err);
      if (err.config?.suppressGlobalError) return Promise.reject(err);

      const msg: string =
        err.response?.data?.error ??
        err.response?.data?.message ??
        (err.request != null ? 'Error de conexión con el servidor' : 'Ocurrió un error inesperado');

      errorBus.emit(msg);
      return Promise.reject(err);
    }
  );
}
