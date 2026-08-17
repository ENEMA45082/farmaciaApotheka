import * as puntosRepo from '../repositories/puntos.repository';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import { calcularPuntosPorPedido } from '../config/puntosConfig';
import type {
  Pedido,
  SaldoPuntos,
  Premio,
  CrearPremioDTO,
  ActualizarPremioDTO,
  CanjePremio,
  CanjePremioConDetalle,
} from '../types';

// Se llama desde pedidos.service.ts::cambiarEstado al marcar 'Entregado'.
// Si el pedido no llega a generar puntos (monto muy bajo), ni se llama a la
// RPC — evita una acreditación de 0 puntos sin sentido en el ledger.
export async function acreditarPorPedido(pedido: Pedido): Promise<void> {
  const puntos = calcularPuntosPorPedido(pedido.total);
  if (puntos <= 0) return;
  await puntosRepo.acreditarPuntos(pedido.id, pedido.user_id, puntos);
}

export async function obtenerMiSaldo(clienteId: string): Promise<SaldoPuntos> {
  const [saldo, movimientos] = await Promise.all([
    puntosRepo.obtenerSaldo(clienteId),
    puntosRepo.listarMovimientos(clienteId),
  ]);
  return { saldo, movimientos };
}

export async function listarCatalogo(): Promise<Premio[]> {
  return puntosRepo.listarPremios(true);
}

export async function canjear(clienteId: string, premioId: string): Promise<CanjePremio> {
  validarUUID(premioId, 'premio');
  return puntosRepo.canjear(clienteId, premioId);
}

export async function listarPremiosAdmin(): Promise<Premio[]> {
  return puntosRepo.listarPremios(false);
}

export async function crearPremio(dto: CrearPremioDTO): Promise<Premio> {
  if (!dto.nombre?.trim()) {
    throw new AppError('El nombre del premio es obligatorio', 400, 'PREMIO_NOMBRE_REQUERIDO');
  }
  if (!dto.costo_puntos || dto.costo_puntos <= 0) {
    throw new AppError('El costo en puntos debe ser mayor a 0', 400, 'PREMIO_COSTO_INVALIDO');
  }

  return puntosRepo.crearPremio({ ...dto, nombre: dto.nombre.trim() });
}

export async function actualizarPremio(id: string, dto: ActualizarPremioDTO): Promise<Premio> {
  validarUUID(id, 'premio');
  if (dto.costo_puntos !== undefined && dto.costo_puntos <= 0) {
    throw new AppError('El costo en puntos debe ser mayor a 0', 400, 'PREMIO_COSTO_INVALIDO');
  }

  const cambios: Record<string, unknown> = {};
  if (dto.nombre !== undefined) cambios.nombre = dto.nombre.trim();
  if ('descripcion' in dto) cambios.descripcion = dto.descripcion;
  if ('imagen_url' in dto) cambios.imagen_url = dto.imagen_url;
  if (dto.costo_puntos !== undefined) cambios.costo_puntos = dto.costo_puntos;
  if ('stock' in dto) cambios.stock = dto.stock;
  if (dto.activo !== undefined) cambios.activo = dto.activo;

  if (Object.keys(cambios).length === 0) {
    throw new AppError('Se debe enviar al menos un campo para actualizar', 400, 'SIN_CAMBIOS');
  }

  const premio = await puntosRepo.actualizarPremio(id, cambios);
  if (!premio) {
    throw new AppError('Premio no encontrado', 404, 'PREMIO_NOT_FOUND');
  }
  return premio;
}

export async function listarCanjesAdmin(): Promise<CanjePremioConDetalle[]> {
  return puntosRepo.listarCanjesAdmin();
}
