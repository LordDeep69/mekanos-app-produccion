import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaAlertasStockRepository } from '../infrastructure/prisma-alertas-stock.repository';
import { AlertaResult } from '../interfaces/alertas-stock.repository.interface';
import { ResolverAlertaCommand } from './resolver-alerta.command';

@CommandHandler(ResolverAlertaCommand)
export class ResolverAlertaHandler implements ICommandHandler<ResolverAlertaCommand> {
  constructor(private readonly repository: PrismaAlertasStockRepository) {}

  async execute(command: ResolverAlertaCommand): Promise<AlertaResult> {
    return await this.repository.resolverAlerta(command.id_alerta, command.userId, command.observaciones);
  }
}
