import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, BadRequestException } from '@nestjs/common';
import { CreateActividadCommand } from './create-actividad.command';
import { PrismaActividadesRepository } from '../../infrastructure/prisma-actividades.repository';

/**
 * Handler para crear actividad ejecutada
 * Validaciones:
 * - Modo dual: Catálogo XOR Manual
 * - Si manual, sistema es obligatorio
 * - ejecutada_por = userId del JWT
 */

@CommandHandler(CreateActividadCommand)
export class CreateActividadHandler
  implements ICommandHandler<CreateActividadCommand>
{
  constructor(
    @Inject('IActividadesRepository')
    private readonly repository: PrismaActividadesRepository,
  ) {}

  async execute(command: CreateActividadCommand): Promise<any> {
    const { dto, userId } = command;

    // Validación modo dual: uno y solo uno
    if (dto.id_actividad_catalogo && dto.descripcion_manual) {
      throw new BadRequestException(
        'Modo dual inválido: usar id_actividad_catalogo O descripcion_manual, no ambos',
      );
    }

    if (!dto.id_actividad_catalogo && !dto.descripcion_manual) {
      throw new BadRequestException(
        'Modo dual inválido: id_actividad_catalogo o descripcion_manual es obligatorio',
      );
    }

    // Si modo manual, sistema es obligatorio
    if (dto.descripcion_manual && !dto.sistema) {
      throw new BadRequestException(
        'Modo manual: campo sistema es obligatorio cuando descripcion_manual está presente',
      );
    }

    const actividad = await this.repository.save({
      id_orden_servicio: dto.id_orden_servicio,
      id_actividad_catalogo: dto.id_actividad_catalogo || null,
      descripcion_manual: dto.descripcion_manual || null,
      sistema: dto.sistema || null,
      orden_secuencia: dto.orden_secuencia || null,
      estado: dto.estado || null,
      observaciones: dto.observaciones || null,
      ejecutada: dto.ejecutada ?? true,
      fecha_ejecucion: dto.fecha_ejecucion
        ? new Date(dto.fecha_ejecucion)
        : new Date(),
      ejecutada_por: userId, // Usuario desde JWT
      tiempo_ejecucion_minutos: dto.tiempo_ejecucion_minutos || null,
      requiere_evidencia: dto.requiere_evidencia ?? false,
      evidencia_capturada: dto.evidencia_capturada ?? false,
    });

    return actividad;
  }
}
