import * as cuponesRepo from '../repositories/cupones.repository';
import * as productosService from './productos.service';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import type {
  Cupon,
  CuponConUsos,
  CrearCuponDTO,
  ActualizarCuponDTO,
  ItemCarritoInput,
  ItemPedidoConfirmado,
  MotivoCuponInvalido,
  ResultadoValidacionCupon,
} from '../types';

interface ValidarCuponInput {
  codigo: string;
  clienteId: string;
  itemsCarrito: ItemCarritoInput[];
}

export async function validarCupon({ codigo, clienteId, itemsCarrito }: ValidarCuponInput): Promise<ResultadoValidacionCupon> {
  const codigoNormalizado = codigo.trim().toUpperCase();

  const cupon = await cuponesRepo.encontrarPorCodigo(codigoNormalizado);
  if (!cupon) {
    return fallo('CODIGO_INEXISTENTE', 'El código ingresado no existe.');
  }

  if (!cupon.activo) {
    return fallo('INACTIVO', 'Este cupón ya no está activo.');
  }

  const ahora = new Date();
  if (cupon.valido_desde && ahora < new Date(cupon.valido_desde)) {
    return fallo('AUN_NO_VIGENTE', 'Este cupón todavía no está vigente.');
  }
  if (cupon.valido_hasta && ahora > new Date(cupon.valido_hasta)) {
    return fallo('VENCIDO', 'Este cupón ya venció.');
  }

  if (cupon.limite_usos_total != null) {
    const usosTotales = await cuponesRepo.contarUsosTotal(cupon.id);
    if (usosTotales >= cupon.limite_usos_total) {
      return fallo('LIMITE_USOS_ALCANZADO', 'Este cupón alcanzó su límite de usos.');
    }
  }

  if (cupon.limite_usos_por_cliente != null) {
    const usosCliente = await cuponesRepo.contarUsosPorCliente(cupon.id, clienteId);
    if (usosCliente >= cupon.limite_usos_por_cliente) {
      return fallo('LIMITE_CLIENTE_ALCANZADO', 'Ya usaste este cupón el máximo de veces permitido.');
    }
  }

  // Igual que en pedidos.service.ts::crear: el precio de cada item se
  // re-resuelve contra el catálogo, nunca se confía en lo que manda el
  // cliente en itemsCarrito (solo se usan producto_id + cantidad).
  const { itemsConfirmados } = await productosService.resolverItemsCarrito(itemsCarrito);
  const montoElegible = calcularMontoElegible(itemsConfirmados);

  if (montoElegible < cupon.compra_minima) {
    const faltante = cupon.compra_minima - montoElegible;
    return fallo(
      'COMPRA_MINIMA_NO_ALCANZADA',
      `Te faltan $${faltante.toFixed(2)} en productos para poder usar este cupón.`,
      montoElegible,
    );
  }

  return {
    valido: true,
    descuento: calcularDescuento(cupon, montoElegible),
    montoElegible,
    cuponId: cupon.id,
  };
}

// Aislada a propósito: hoy el descuento se calcula sobre el total del
// carrito, pero cuando haya que excluir categorías (ej. medicamentos con
// receta / precios regulados — candidato natural: producto.es_venta_libre
// === false, ver productos.repository.ts) alcanza con filtrar itemsConfirmados
// acá adentro, sin tocar el resto del motor de validación.
function calcularMontoElegible(itemsConfirmados: ItemPedidoConfirmado[]): number {
  return itemsConfirmados.reduce((s, i) => s + i.precio_unitario * i.cantidad - i.descuento, 0);
}

function calcularDescuento(cupon: Cupon, montoElegible: number): number {
  if (cupon.tipo === 'porcentaje') {
    const descuento = montoElegible * cupon.valor / 100;
    return cupon.descuento_maximo != null ? Math.min(descuento, cupon.descuento_maximo) : descuento;
  }
  // fijo: nunca descontar más que el monto elegible.
  return Math.min(cupon.valor, montoElegible);
}

function fallo(motivo: MotivoCuponInvalido, mensaje: string, montoElegible = 0): ResultadoValidacionCupon {
  return { valido: false, descuento: 0, montoElegible, motivo, mensaje };
}

export async function listarConUsos(): Promise<CuponConUsos[]> {
  return cuponesRepo.listarConUsos();
}

export async function crear(dto: CrearCuponDTO): Promise<Cupon> {
  const codigo = dto.codigo.trim().toUpperCase();
  if (!codigo) {
    throw new AppError('El código del cupón es obligatorio', 400, 'CUPON_CODIGO_REQUERIDO');
  }
  if (dto.tipo === 'porcentaje' && dto.valor > 100) {
    throw new AppError('Un cupón porcentaje no puede superar el 100%', 400, 'CUPON_VALOR_INVALIDO');
  }

  const existente = await cuponesRepo.encontrarPorCodigo(codigo);
  if (existente) {
    throw new AppError(`Ya existe un cupón con el código "${codigo}"`, 409, 'CUPON_CODIGO_DUPLICADO');
  }

  return cuponesRepo.crear({ ...dto, codigo });
}

export async function actualizar(id: string, dto: ActualizarCuponDTO): Promise<Cupon> {
  validarUUID(id, 'cupón');
  if (dto.tipo === 'porcentaje' && dto.valor !== undefined && dto.valor > 100) {
    throw new AppError('Un cupón porcentaje no puede superar el 100%', 400, 'CUPON_VALOR_INVALIDO');
  }

  const cambios: Record<string, unknown> = {};
  if (dto.tipo !== undefined) cambios.tipo = dto.tipo;
  if (dto.valor !== undefined) cambios.valor = dto.valor;
  if (dto.compra_minima !== undefined) cambios.compra_minima = dto.compra_minima;
  if ('descuento_maximo' in dto) cambios.descuento_maximo = dto.descuento_maximo;
  if ('limite_usos_total' in dto) cambios.limite_usos_total = dto.limite_usos_total;
  if ('limite_usos_por_cliente' in dto) cambios.limite_usos_por_cliente = dto.limite_usos_por_cliente;
  if ('valido_desde' in dto) cambios.valido_desde = dto.valido_desde;
  if ('valido_hasta' in dto) cambios.valido_hasta = dto.valido_hasta;
  if (dto.activo !== undefined) cambios.activo = dto.activo;

  if (Object.keys(cambios).length === 0) {
    throw new AppError('Se debe enviar al menos un campo para actualizar', 400, 'SIN_CAMBIOS');
  }

  const cupon = await cuponesRepo.actualizar(id, cambios);
  if (!cupon) {
    throw new AppError('Cupón no encontrado', 404, 'CUPON_NOT_FOUND');
  }
  return cupon;
}
