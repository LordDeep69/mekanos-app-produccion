import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { HardDeleteEquipoCommand } from './hard-delete-equipo.command';
import { PrismaEquipoRepository } from '../infrastructure/prisma-equipo.repository';

/**
 * Handler para el comando HardDeleteEquipo
 * ⚠️ Elimina permanentemente el equipo. Solo funciona si:
 *   1. El equipo existe
 *   2. El equipo está inactivo (activo = false)
 *   3. Se envía confirmación explícita "CONFIRMAR"
 */
@CommandHandler(HardDeleteEquipoCommand)
export class HardDeleteEquipoHandler implements ICommandHandler<HardDeleteEquipoCommand> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: PrismaEquipoRepository
  ) {}

  async execute(command: HardDeleteEquipoCommand): Promise<void> {
    const { equipoId, confirmacion } = command;

    // Validar confirmación explícita
    if (confirmacion !== 'CONFIRMAR') {
      throw new BadRequestException(
        'Debe enviar confirmacion: "CONFIRMAR" para eliminar permanentemente el equipo'
      );
    }

    // Validar que el equipo existe
    const equipo = await this.equipoRepository.findById(equipoId);
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${equipoId} no encontrado`);
    }

    // Validar que el equipo esté inactivo
    if (equipo.activo !== false) {
      throw new BadRequestException(
        'Solo se pueden eliminar permanentemente equipos que estén marcados como inactivos (activo = false)'
      );
    }

    // Hard delete
    await this.equipoRepository.hardDelete(equipoId);
  }
}
