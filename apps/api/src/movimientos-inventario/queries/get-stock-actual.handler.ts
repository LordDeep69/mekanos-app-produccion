import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaMovimientosInventarioRepository } from '../infrastructure/prisma-movimientos-inventario.repository';
import { GetStockActualQuery } from './get-stock-actual.query';

@QueryHandler(GetStockActualQuery)
export class GetStockActualHandler
  implements IQueryHandler<GetStockActualQuery>
{
  constructor(
    private readonly repository: PrismaMovimientosInventarioRepository,
  ) {}

  async execute(query: GetStockActualQuery) {
    const stock = await this.repository.calcularStockActual(query.id_componente);
    return { id_componente: query.id_componente, stock_actual: stock };
  }
}
