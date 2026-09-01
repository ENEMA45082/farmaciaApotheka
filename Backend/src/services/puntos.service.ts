import * as puntosRepo from '../repositories/puntos.repository';
import * as perfilRepo from '../repositories/perfil.repository';
import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import { validarUUID } from '../utils/validarUUID';
import { calcularPuntosPorPedido } from '../config/puntosConfig';
import { validarDocumento } from '../utils/validarDocumento';
import type {
  Pedido,
  SaldoPuntos,
  Premio,
  CrearPremioDTO,
  ActualizarPremioDTO,
  CanjePremio,
  CanjePremioConDetalle,
  ClienteBusquedaDNI,
  AcreditarPuntosManualDTO,
  CrearClienteFisicoDTO,
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

export async function buscarClientePorDni(dni: string): Promise<ClienteBusquedaDNI[]> {
  const dniLimpio = dni.trim();
  if (!dniLimpio) {
    throw new AppError('Ingresá un DNI para buscar', 400, 'DNI_REQUERIDO');
  }

  const perfiles = await perfilRepo.encontrarPorDni(dniLimpio);
  if (perfiles.length === 0) {
    throw new AppError('No se encontró ningún cliente registrado con ese DNI.', 404, 'CLIENTE_NOT_FOUND');
  }

  return Promise.all(perfiles.map(async perfil => {
    // El "email" de un cliente físico es el sintético usado solo para poder
    // crear la cuenta de Auth (ver crearClienteFisico) — no tiene sentido
    // mostrárselo al admin como si fuera un contacto real.
    const email = perfil.es_cliente_fisico
      ? null
      : (await supabase.auth.admin.getUserById(perfil.user_id).catch(() => null))?.data?.user?.email ?? null;
    return {
      user_id:           perfil.user_id,
      email,
      nombre:            perfil.nombre,
      apellido:          perfil.apellido,
      dni:               perfil.dni,
      puntos_saldo:      await puntosRepo.obtenerSaldo(perfil.user_id),
      es_cliente_fisico: perfil.es_cliente_fisico,
    };
  }));
}

export async function acreditarManual(dto: AcreditarPuntosManualDTO): Promise<number> {
  validarUUID(dto.cliente_id, 'cliente');
  if (!Number.isInteger(dto.puntos) || dto.puntos <= 0) {
    throw new AppError('La cantidad de puntos debe ser un número entero mayor a 0', 400, 'PUNTOS_INVALIDOS');
  }

  return puntosRepo.acreditarManual(dto.cliente_id, dto.puntos, dto.motivo?.trim() || null);
}

// Alta manual de un cliente que compró en el local y no tiene cuenta online.
// Crea un usuario real de Supabase Auth por detrás (sin contraseña, con un
// email sintético derivado del CUIT — nunca real, nunca se le manda nada) para
// poder reusar toda la infraestructura de puntos existente, que exige
// cliente_id NOT NULL REFERENCES auth.users(id). Si esta persona se registra
// de verdad más adelante con el mismo CUIT, perfil.service.ts::actualizar
// fusiona automáticamente este perfil con la cuenta real.
export async function crearClienteFisico(dto: CrearClienteFisicoDTO, adminUserId: string): Promise<ClienteBusquedaDNI> {
  if (!dto.nombre?.trim())   throw new AppError('El nombre es obligatorio', 400, 'CLIENTE_FISICO_NOMBRE_REQUERIDO');
  if (!dto.apellido?.trim()) throw new AppError('El apellido es obligatorio', 400, 'CLIENTE_FISICO_APELLIDO_REQUERIDO');
  if (!dto.telefono?.trim()) throw new AppError('El teléfono es obligatorio', 400, 'CLIENTE_FISICO_TELEFONO_REQUERIDO');
  validarDocumento('CUIT', dto.dni);
  const cuit = dto.dni.replace(/\D/g, '');

  // Re-chequeo server-side: el frontend solo ofrece este alta después de una
  // búsqueda que ya dio negativo, pero no hay que confiar solo en eso — el
  // índice único parcial de la DB es la garantía real ante una carrera.
  const existentes = await perfilRepo.encontrarPorDni(cuit);
  if (existentes.length > 0) {
    throw new AppError('Ya existe un cliente con ese CUIT.', 409, 'CLIENTE_FISICO_CUIT_DUPLICADO');
  }

  const emailSintetico = `cliente-fisico-${cuit}@apotheka.invalid`;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: emailSintetico,
    email_confirm: true,
    user_metadata: { es_cliente_fisico: true, cuit, creado_por_admin_id: adminUserId },
  });

  if (authError || !authData?.user) {
    throw new AppError('No se pudo crear el cliente físico. Intentá de nuevo.', 502, 'CLIENTE_FISICO_AUTH_ERROR');
  }

  try {
    const perfil = await perfilRepo.crearClienteFisico(authData.user.id, {
      nombre:   dto.nombre.trim(),
      apellido: dto.apellido.trim(),
      dni:      cuit,
      telefono: dto.telefono.trim(),
      email:    dto.email?.trim() || null,
      creadoPorAdminId: adminUserId,
    });

    return {
      user_id:           perfil.user_id,
      email:             null,
      nombre:            perfil.nombre,
      apellido:          perfil.apellido,
      dni:               perfil.dni,
      puntos_saldo:      0,
      es_cliente_fisico: true,
    };
  } catch (err) {
    // No hay transacción real posible entre Auth (GoTrue) y la tabla
    // perfiles — si el insert falla después de crear la cuenta, hay que
    // compensar a mano para no dejar un usuario de Auth huérfano.
    await supabase.auth.admin.deleteUser(authData.user.id).catch(rollbackErr => {
      console.error('[crearClienteFisico] usuario de Auth huérfano, requiere borrado manual:', authData.user.id, rollbackErr);
    });
    if ((err as { code?: string })?.code === '23505') {
      throw new AppError('Ya existe un cliente con ese CUIT.', 409, 'CLIENTE_FISICO_CUIT_DUPLICADO');
    }
    throw new AppError('Error al crear el cliente físico. Intentá de nuevo.', 500, 'CLIENTE_FISICO_ERROR');
  }
}
