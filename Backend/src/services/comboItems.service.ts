import * as comboItemsRepo from '../repositories/comboItems.repository';
import * as productosRepo from '../repositories/productos.repository';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import type { ComboItem, CrearComboItemDTO, ActualizarComboItemDTO } from '../types';

export async function listarPorCombo(comboId: string): Promise<ComboItem[]> {
  validarUUID(comboId, 'combo');
  return comboItemsRepo.encontrarPorComboId(comboId);
}

export async function agregar(dto: CrearComboItemDTO): Promise<ComboItem> {
  validarUUID(dto.combo_id, 'combo');
  validarUUID(dto.producto_id, 'producto');

  if (dto.combo_id === dto.producto_id) {
    throw new AppError('Un combo no puede tenerse a sí mismo como componente', 400, 'COMBO_AUTOREFERENCIA');
  }

  const productoComponente = await productosRepo.encontrarPorId(dto.producto_id);
  if (!productoComponente) {
    throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NOT_FOUND');
  }
  // Sin este chequeo, un combo-de-combos rompería resolverItemsCarrito en
  // silencio: el componente "combo" nunca tiene stock real, y su id
  // terminaría llegando a descontar_stock como si lo tuviera.
  if (productoComponente.es_combo) {
    throw new AppError('Un combo no puede tener a otro combo como componente', 400, 'COMBO_NO_ANIDABLE');
  }

  const existente = await comboItemsRepo.encontrarPorComboIdYProductoId(dto.combo_id, dto.producto_id);
  if (existente) {
    throw new AppError(`"${productoComponente.nombre}" ya es un componente de este combo`, 409, 'COMBO_ITEM_DUPLICADO');
  }

  return comboItemsRepo.crear(dto.combo_id, dto.producto_id, dto.cantidad);
}

export async function actualizarCantidad(id: string, dto: ActualizarComboItemDTO): Promise<ComboItem> {
  validarUUID(id, 'componente de combo');
  if (dto.cantidad === undefined || dto.cantidad < 1) {
    throw new AppError('La cantidad debe ser al menos 1', 400, 'COMBO_ITEM_CANTIDAD_INVALIDA');
  }
  const actualizado = await comboItemsRepo.actualizarCantidad(id, dto.cantidad);
  if (!actualizado) throw new AppError('Componente de combo no encontrado', 404, 'COMBO_ITEM_NOT_FOUND');
  return actualizado;
}

export async function eliminar(id: string): Promise<void> {
  validarUUID(id, 'componente de combo');
  const existe = await comboItemsRepo.encontrarPorId(id);
  if (!existe) throw new AppError('Componente de combo no encontrado', 404, 'COMBO_ITEM_NOT_FOUND');
  await comboItemsRepo.eliminar(id);
}
