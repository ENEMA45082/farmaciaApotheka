import * as perfilRepo from '../repositories/perfil.repository';
import { validarDocumento, extraerDniDeCuit } from '../utils/validarDocumento';
import type { Perfil, ActualizarPerfilDTO } from '../types';

export async function obtener(
  userId: string,
  datosIniciales?: { nombre?: string; apellido?: string },
): Promise<Perfil> {
  return perfilRepo.encontrarOCrear(userId, datosIniciales);
}

export async function actualizar(
  userId: string,
  dto: ActualizarPerfilDTO,
  datosIniciales?: { nombre?: string; apellido?: string },
): Promise<Perfil> {
  const perfilActual = await perfilRepo.encontrarOCrear(userId, datosIniciales);

  if (dto.dni !== undefined || dto.documento_tipo !== undefined) {
    const tipo = dto.documento_tipo ?? perfilActual.documento_tipo;
    const numero = dto.dni ?? perfilActual.dni ?? '';
    validarDocumento(tipo, numero);

    // Si alguien carga un documento (DNI o CUIT) que ya tenía puntos
    // cargados por el admin (compra física, sin cuenta propia — ver
    // puntos.service.ts::crearClienteFisico), fusionar esos puntos a esta
    // cuenta real. El cliente físico siempre se guarda con DNI puro (ver
    // perfil.repository.ts::crearClienteFisico), así que acá siempre se
    // normaliza a DNI puro antes de buscar — si el documento real es un
    // CUIT, se le extrae el DNI que codifica (extraerDniDeCuit). Se hace
    // ANTES del update normal: si el update fallara después de una fusión ya
    // confirmada, el próximo guardado vuelve a mandar `dni` y todo se
    // re-verifica solo. Al revés, un fallo en la fusión dejaría el documento
    // ya guardado sin ningún disparador futuro (un guardado que no toque
    // `dni` nunca volvería a intentarlo) — puntos huérfanos para siempre.
    if (dto.dni !== undefined) {
      const numeroNormalizado = numero.replace(/\D/g, '');
      dto = { ...dto, dni: numeroNormalizado };
      const dniPuro = tipo === 'CUIT' ? extraerDniDeCuit(numeroNormalizado) : numeroNormalizado;
      await perfilRepo.fusionarClienteFisico(userId, dniPuro);
    }
  }

  return perfilRepo.actualizar(userId, dto);
}
