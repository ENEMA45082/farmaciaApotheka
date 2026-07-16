import * as estadosRepo from '../repositories/estados.repository';
import type { Estado } from '../types';

export async function listar(): Promise<Estado[]> {
  return estadosRepo.listarTodos();
}
