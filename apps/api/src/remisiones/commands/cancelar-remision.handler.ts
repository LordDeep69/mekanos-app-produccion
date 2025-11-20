import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaRemisionesRepository } from '../infrastructure/prisma-remisiones.repository';
import { CancelarRemisionCommand } from './cancelar-remision.command';

@CommandHandler(CancelarRemisionCommand)
export class CancelarRemisionHandler
  implements ICommandHandler<CancelarRemisionCommand>
{
  constructor(private readonly repository: PrismaRemisionesRepository) {}

  async execute(command: CancelarRemisionCommand) {
    const remision = await this.repository.cancelarRemision(
      command.id_remision,
      command.motivo_cancelacion,
      command.userId,
    );

    return remision;
  }
}
