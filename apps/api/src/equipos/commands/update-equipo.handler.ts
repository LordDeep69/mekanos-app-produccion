import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException, Inject } from '@nestjs/common';
import { UpdateEquipoCommand } from './update-equipo.command';
import { IEquipoRepository, EquipoEntity, EquipoId, EstadoEquipo } from '@mekanos/core';

/**
 * Handler para el comando UpdateEquipo
 */
@CommandHandler(UpdateEquipoCommand)
export class UpdateEquipoHandler implements ICommandHandler<UpdateEquipoCommand> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: IEquipoRepository
  ) {}

  async execute(command: UpdateEquipoCommand): Promise<EquipoEntity> {
    const { equipoId, dto } = command;

    // Obtener equipo existente
    const equipo = await this.equipoRepository.findById(EquipoId.from(equipoId));
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${equipoId} no encontrado`);
    }

    // Actualizar información básica
    if (dto.marca || dto.modelo || dto.serie !== undefined || dto.nombreEquipo !== undefined) {
      equipo.actualizarInformacion(dto.marca, dto.modelo, dto.serie, dto.nombreEquipo);
    }

    // Cambiar estado si se proporcionó
    if (dto.estado) {
      const nuevoEstado = EstadoEquipo.create(dto.estado);
      equipo.cambiarEstado(nuevoEstado);
    }

    // Persistir cambios
    return await this.equipoRepository.save(equipo);
  }
}
