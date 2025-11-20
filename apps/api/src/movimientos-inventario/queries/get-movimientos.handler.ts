import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaMovimientosInventarioRepository } from '../infrastructure/prisma-movimientos-inventario.repository';
import { GetMovimientosQuery } from './get-movimientos.query';

@QueryHandler(GetMovimientosQuery)
export class GetMovimientosHandler
  implements IQueryHandler<GetMovimientosQuery>
{
  constructor(
    private readonly repository: PrismaMovimientosInventarioRepository,
  ) {}

  async execute(query: GetMovimientosQuery) {
    const result = await this.repository.findAll(query.filters as any);
    return result;
  }
}
