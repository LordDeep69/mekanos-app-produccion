import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException, Inject } from '@nestjs/common';
import { DeleteEquipoCommand } from './delete-equipo.command';
import { IEquipoRepository, EquipoId } from '@mekanos/core';

/**
 * Handler para el comando DeleteEquipo
 */
@CommandHandler(DeleteEquipoCommand)
export class DeleteEquipoHandler implements ICommandHandler<DeleteEquipoCommand> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: IEquipoRepository
  ) {}

  async execute(command: DeleteEquipoCommand): Promise<void> {
    const { equipoId } = command;

    // Validar que el equipo existe
    const equipo = await this.equipoRepository.findById(EquipoId.from(equipoId));
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${equipoId} no encontrado`);
    }

    // Eliminar (soft delete recomendado en implementación de repository)
    await this.equipoRepository.delete(EquipoId.from(equipoId));
  }
}
