import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AlertasStockController } from './alertas-stock.controller';
import { PrismaAlertasStockRepository } from './infrastructure/prisma-alertas-stock.repository';

// Command Handlers
import { GenerarAlertasAutomaticasHandler } from './commands/generar-alertas-automaticas.handler';
import { ResolverAlertaHandler } from './commands/resolver-alerta.handler';

// Query Handlers
import { GetAlertasStockHandler } from './queries/get-alertas-stock.handler';
import { GetDashboardAlertasHandler } from './queries/get-dashboard-alertas.handler';

const CommandHandlers = [
  GenerarAlertasAutomaticasHandler,
  ResolverAlertaHandler,
];

const QueryHandlers = [
  GetAlertasStockHandler,
  GetDashboardAlertasHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [AlertasStockController],
  providers: [
    PrismaAlertasStockRepository,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaAlertasStockRepository],
})
export class AlertasStockModule {}

