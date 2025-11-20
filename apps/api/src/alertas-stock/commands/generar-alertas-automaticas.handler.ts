import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaAlertasStockRepository } from '../infrastructure/prisma-alertas-stock.repository';
import { AlertaGeneracionResult } from '../interfaces/alertas-stock.repository.interface';
import { GenerarAlertasAutomaticasCommand } from './generar-alertas-automaticas.command';

@CommandHandler(GenerarAlertasAutomaticasCommand)
export class GenerarAlertasAutomaticasHandler implements ICommandHandler<GenerarAlertasAutomaticasCommand> {
  constructor(private readonly repository: PrismaAlertasStockRepository) {}

  async execute(_command: GenerarAlertasAutomaticasCommand): Promise<AlertaGeneracionResult> {
    return await this.repository.generarAlertasAutomaticas();
  }
}
