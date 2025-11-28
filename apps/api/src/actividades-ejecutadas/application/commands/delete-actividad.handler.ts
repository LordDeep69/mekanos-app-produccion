import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaActividadesRepository } from '../../infrastructure/prisma-actividades.repository';
import { DeleteActividadCommand } from './delete-actividad.command';

@CommandHandler(DeleteActividadCommand)
export class DeleteActividadHandler implements ICommandHandler<DeleteActividadCommand> {
  constructor(private readonly repository: PrismaActividadesRepository) {}

  async execute(command: DeleteActividadCommand): Promise<void> {
    const existe = await this.repository.findById(command.id);
    if (!existe) {
      throw new NotFoundException(`Actividad ${command.id} no encontrada`);
    }

    await this.repository.delete(command.id);
  }
}
