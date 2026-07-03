import axios, { type AxiosInstance } from 'axios';
import { errorBus } from '../utils/errorBus';

export function addErrorInterceptor(api: AxiosInstance): void {
  api.interceptors.response.use(
    res => res,
    err => {
      if (axios.isCancel(err)) return Promise.reject(err);
      if (err.response?.status === 401) return Promise.reject(err);

      const msg: string =
        err.response?.data?.error ??
        err.response?.data?.message ??
        (err.request != null ? 'Error de conexión con el servidor' : 'Ocurrió un error inesperado');

      errorBus.emit(msg);
      return Promise.reject(err);
    }
  );
}
