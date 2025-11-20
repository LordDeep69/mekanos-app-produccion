import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaAlertasStockRepository } from '../infrastructure/prisma-alertas-stock.repository';
import { AlertasStockPaginatedResult } from '../interfaces/alertas-stock.repository.interface';
import { GetAlertasStockQuery } from './get-alertas-stock.query';

@QueryHandler(GetAlertasStockQuery)
export class GetAlertasStockHandler implements IQueryHandler<GetAlertasStockQuery> {
  constructor(private readonly repository: PrismaAlertasStockRepository) {}

  async execute(query: GetAlertasStockQuery): Promise<AlertasStockPaginatedResult> {
    return await this.repository.findAll({
      tipo_alerta: query.tipo_alerta,
      nivel: query.nivel,
      estado: query.estado,
      id_componente: query.id_componente,
      fecha_desde: query.fecha_desde,
      fecha_hasta: query.fecha_hasta,
      page: query.page,
      limit: query.limit,
    });
  }
}
