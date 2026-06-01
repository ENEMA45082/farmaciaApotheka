import * as favoritosRepo from '../repositories/favoritos.repository';

export async function listar(userId: string): Promise<string[]> {
  return favoritosRepo.listarIdsPorUsuario(userId);
}

export async function toggle(userId: string, productoId: string): Promise<{ favorito: boolean }> {
  const yaExiste = await favoritosRepo.existe(userId, productoId);
  if (yaExiste) {
    await favoritosRepo.quitar(userId, productoId);
    return { favorito: false };
  } else {
    await favoritosRepo.agregar(userId, productoId);
    return { favorito: true };
  }
}
