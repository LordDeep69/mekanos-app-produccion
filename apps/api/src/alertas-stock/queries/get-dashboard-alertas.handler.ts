import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaAlertasStockRepository } from '../infrastructure/prisma-alertas-stock.repository';
import { AlertasDashboardResult } from '../interfaces/alertas-stock.repository.interface';
import { GetDashboardAlertasQuery } from './get-dashboard-alertas.query';

@QueryHandler(GetDashboardAlertasQuery)
export class GetDashboardAlertasHandler implements IQueryHandler<GetDashboardAlertasQuery> {
  constructor(private readonly repository: PrismaAlertasStockRepository) {}

  async execute(_query: GetDashboardAlertasQuery): Promise<AlertasDashboardResult> {
    return await this.repository.getDashboard();
  }
}
