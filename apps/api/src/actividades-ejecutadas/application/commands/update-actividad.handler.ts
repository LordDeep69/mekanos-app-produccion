import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateActividadCommand } from './update-actividad.command';
import { PrismaActividadesRepository } from '../../infrastructure/prisma-actividades.repository';

/**
 * Handler para actualizar actividad ejecutada
 */

@CommandHandler(UpdateActividadCommand)
export class UpdateActividadHandler
  implements ICommandHandler<UpdateActividadCommand>
{
  constructor(
    @Inject('IActividadesRepository')
    private readonly repository: PrismaActividadesRepository,
  ) {}

  async execute(command: UpdateActividadCommand): Promise<any> {
    const { dto } = command;

    // Validar existencia
    const existe = await this.repository.findById(dto.id_actividad_ejecutada);
    if (!existe) {
      throw new NotFoundException(
        `Actividad ${dto.id_actividad_ejecutada} no encontrada`,
      );
    }

    // Validación modo dual si se está cambiando
    if (dto.id_actividad_catalogo !== undefined && dto.descripcion_manual !== undefined) {
      if (dto.id_actividad_catalogo && dto.descripcion_manual) {
        throw new BadRequestException(
          'Modo dual inválido: usar id_actividad_catalogo O descripcion_manual',
        );
      }
    }

    // Si se actualiza a modo manual, sistema es obligatorio
    if (dto.descripcion_manual && !dto.sistema && !existe.sistema) {
      throw new BadRequestException(
        'Modo manual: sistema es obligatorio con descripcion_manual',
      );
    }

    const actividadActualizada = await this.repository.save({
      id_actividad_ejecutada: dto.id_actividad_ejecutada,
      id_orden_servicio: dto.id_orden_servicio || existe.id_orden_servicio,
      id_actividad_catalogo: dto.id_actividad_catalogo ?? existe.id_actividad_catalogo,
      descripcion_manual: dto.descripcion_manual ?? existe.descripcion_manual,
      sistema: dto.sistema ?? existe.sistema,
      orden_secuencia: dto.orden_secuencia ?? existe.orden_secuencia,
      estado: dto.estado ?? existe.estado,
      observaciones: dto.observaciones ?? existe.observaciones,
      ejecutada: dto.ejecutada ?? existe.ejecutada,
      tiempo_ejecucion_minutos: dto.tiempo_ejecucion_minutos ?? existe.tiempo_ejecucion_minutos,
      requiere_evidencia: dto.requiere_evidencia ?? existe.requiere_evidencia,
      evidencia_capturada: dto.evidencia_capturada ?? existe.evidencia_capturada,
    });

    return actividadActualizada;
  }
}
