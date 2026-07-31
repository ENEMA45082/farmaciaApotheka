import { AppError } from '../errors/AppError';

// Único punto que decide "¿este recurso es del usuario que pide?" para los
// repository functions que traen por ID sin filtrar por user_id en la query
// (porque esa misma función también la usan flujos admin, ver ARCHITECTURE.md).
export function asegurarPropietario<T extends { user_id: string }>(
  recurso: T | null,
  userId: string,
  nombreRecurso = 'Recurso',
): T {
  if (!recurso) throw new AppError(`${nombreRecurso} no encontrado`, 404, 'NOT_FOUND');
  if (recurso.user_id !== userId) throw new AppError('Acceso denegado', 403, 'FORBIDDEN');
  return recurso;
}
