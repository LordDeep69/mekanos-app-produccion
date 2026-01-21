import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaEquipoRepository } from '../infrastructure/prisma-equipo.repository';
import { UpdateEquipoCommand } from './update-equipo.command';

/**
 * Handler para el comando UpdateEquipo
 * ✅ FASE 2: Usa PrismaEquipoRepository con schema real
 */
@CommandHandler(UpdateEquipoCommand)
export class UpdateEquipoHandler implements ICommandHandler<UpdateEquipoCommand> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: PrismaEquipoRepository
  ) { }

  async execute(command: UpdateEquipoCommand): Promise<any> {
    const { equipoId, dto, userId } = command;

    // Obtener equipo existente
    const equipo = await this.equipoRepository.findById(equipoId);
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${equipoId} no encontrado`);
    }

    // Actualizar con campos reales
    return await this.equipoRepository.save({
      id_equipo: equipoId,
      codigo_equipo: dto.codigo_equipo || equipo.codigo_equipo,
      id_cliente: dto.id_cliente || equipo.id_cliente,
      id_tipo_equipo: dto.id_tipo_equipo || equipo.id_tipo_equipo,
      ubicacion_texto: dto.ubicacion_texto || equipo.ubicacion_texto,
      id_sede: dto.id_sede !== undefined ? dto.id_sede : equipo.id_sede,
      nombre_equipo: dto.nombre_equipo !== undefined ? dto.nombre_equipo : equipo.nombre_equipo,
      numero_serie_equipo: dto.numero_serie_equipo !== undefined ? dto.numero_serie_equipo : equipo.numero_serie_equipo,
      estado_equipo: dto.estado_equipo || (equipo.estado_equipo as string),
      criticidad: dto.criticidad || (equipo.criticidad as string),
      config_parametros: dto.config_parametros !== undefined ? dto.config_parametros : (equipo.config_parametros as Record<string, any> | undefined),
      creado_por: equipo.creado_por,
      modificado_por: userId,
    });
  }
}
