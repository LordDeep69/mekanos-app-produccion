import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaRemisionesRepository } from '../infrastructure/prisma-remisiones.repository';
import { EntregarRemisionCommand } from './entregar-remision.command';

@CommandHandler(EntregarRemisionCommand)
export class EntregarRemisionHandler
  implements ICommandHandler<EntregarRemisionCommand>
{
  constructor(private readonly repository: PrismaRemisionesRepository) {}

  async execute(command: EntregarRemisionCommand) {
    const remision = await this.repository.entregarRemision(
      command.id_remision,
      command.userId,
    );

    return remision;
  }
}
