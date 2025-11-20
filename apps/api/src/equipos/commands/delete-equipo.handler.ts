import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException, Inject } from '@nestjs/common';
import { DeleteEquipoCommand } from './delete-equipo.command';
import { PrismaEquipoRepository } from '../infrastructure/prisma-equipo.repository';

/**
 * Handler para el comando DeleteEquipo
 * ✅ FASE 2: Usa PrismaEquipoRepository con schema real (soft delete)
 */
@CommandHandler(DeleteEquipoCommand)
export class DeleteEquipoHandler implements ICommandHandler<DeleteEquipoCommand> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: PrismaEquipoRepository
  ) {}

  async execute(command: DeleteEquipoCommand): Promise<void> {
    const { equipoId, userId } = command;

    // Validar que el equipo existe
    const equipo = await this.equipoRepository.findById(equipoId);
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${equipoId} no encontrado`);
    }

    // Soft delete (marca activo = false)
    await this.equipoRepository.delete(equipoId, userId);
  }
}
