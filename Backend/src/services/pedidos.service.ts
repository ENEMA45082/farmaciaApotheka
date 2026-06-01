import * as pedidosRepo from '../repositories/pedidos.repository';
import * as productosRepo from '../repositories/productos.repository';
import { ErrorServicio } from './productos.service';
import type { Pedido, CrearPedidoDTO } from '../types';

export async function crear(userId: string, dto: CrearPedidoDTO): Promise<Pedido> {
  if (!dto.items?.length) {
    throw new ErrorServicio('El pedido debe tener al menos un producto', 400);
  }

  for (const item of dto.items) {
    const producto = await productosRepo.encontrarPorId(item.producto_id);
    if (!producto) {
      throw new ErrorServicio(`Producto no encontrado: ${item.nombre_producto}`, 404);
    }
    if (producto.stock < item.cantidad) {
      throw new ErrorServicio(
        `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}`,
        400,
      );
    }
  }

  const total         = dto.items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
  const subtotalLista = dto.items.reduce((s, i) => s + i.precio_lista    * i.cantidad, 0);
  const pedido = await pedidosRepo.crear(userId, dto, total, subtotalLista);

  for (const item of dto.items) {
    await productosRepo.descontarStock(item.producto_id, item.cantidad);
  }

  return pedido;
}

export async function listar(userId: string): Promise<Pedido[]> {
  return pedidosRepo.encontrarPorUsuario(userId);
}

export async function obtenerPorId(id: string, userId: string): Promise<Pedido> {
  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new ErrorServicio('Pedido no encontrado', 404);
  if (pedido.user_id !== userId) throw new ErrorServicio('Acceso denegado', 403);
  return pedido;
}

export async function listarTodos(): Promise<Pedido[]> {
  return pedidosRepo.encontrarTodos();
}

export async function cambiarEstado(id: string, estado: Pedido['estado']): Promise<Pedido> {
  const VALIDOS: Pedido['estado'][] = ['pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado', 'anulado'];
  if (!VALIDOS.includes(estado)) throw new ErrorServicio('Estado inválido', 400);
  await pedidosRepo.actualizarEstado(id, estado);
  const pedido = await pedidosRepo.encontrarPorId(id);
  if (!pedido) throw new ErrorServicio('Pedido no encontrado', 404);
  return pedido;
}

export async function cancelar(id: string, userId: string): Promise<Pedido> {
  const pedido = await obtenerPorId(id, userId);
  if (pedido.estado !== 'pendiente') {
    throw new ErrorServicio('Solo se pueden cancelar pedidos en estado pendiente', 400);
  }
  const cancelado = await pedidosRepo.cancelar(id, userId);
  if (!cancelado) throw new ErrorServicio('Error al cancelar el pedido', 500);

  for (const detalle of cancelado.detalles ?? []) {
    if (detalle.producto_id) {
      await productosRepo.restaurarStock(detalle.producto_id, detalle.cantidad);
    }
  }

  return cancelado;
}
