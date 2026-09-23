import axios from 'axios';

// Mensaje del backend ({ error }) si la request llegó y falló; el genérico
// si no hubo respuesta o el error no vino de axios.
export function mensajeDeErrorApi(e: unknown, porDefecto: string): string {
  if (axios.isAxiosError(e)) {
    const mensaje = e.response?.data?.error;
    if (typeof mensaje === 'string' && mensaje) return mensaje;
    if (!e.response) return 'Error de conexión con el servidor';
  }
  return porDefecto;
}
