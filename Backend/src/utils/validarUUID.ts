import { AppError } from '../errors/AppError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validarUUID(id: string, entidad = 'recurso'): void {
  if (!UUID_RE.test(id)) {
    throw new AppError(`ID de ${entidad} inválido`, 400, 'INVALID_UUID');
  }
}
