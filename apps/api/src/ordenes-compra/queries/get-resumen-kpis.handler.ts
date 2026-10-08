import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaOrdenesCompraRepository } from '../infrastructure/prisma-ordenes-compra.repository';
import { OrdenesCompraResumenKpis } from '../interfaces/ordenes-compra.repository.interface';
import { GetResumenKpisQuery } from './get-resumen-kpis.query';

@QueryHandler(GetResumenKpisQuery)
export class GetResumenKpisHandler implements IQueryHandler<GetResumenKpisQuery> {
  constructor(private readonly repository: PrismaOrdenesCompraRepository) {}

  async execute(_query: GetResumenKpisQuery): Promise<OrdenesCompraResumenKpis> {
    return await this.repository.getResumenKpis();
  }
}
