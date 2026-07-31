import * as favoritosRepo from '../repositories/favoritos.repository';
import * as productosRepo from '../repositories/productos.repository';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';

export async function listar(userId: string): Promise<string[]> {
  return favoritosRepo.listarIdsPorUsuario(userId);
}

export async function toggle(userId: string, productoId: string): Promise<{ favorito: boolean }> {
  validarUUID(productoId, 'producto');

  const yaExiste = await favoritosRepo.existe(userId, productoId);
  if (yaExiste) {
    await favoritosRepo.quitar(userId, productoId);
    return { favorito: false };
  }

  // Sin este chequeo, se puede marcar como favorito un producto_id que no
  // existe (o ya no existe) — queda un favorito "fantasma" que nunca va a
  // poder mostrarse.
  const producto = await productosRepo.encontrarPorId(productoId);
  if (!producto) {
    throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NOT_FOUND');
  }

  await favoritosRepo.agregar(userId, productoId);
  return { favorito: true };
}
