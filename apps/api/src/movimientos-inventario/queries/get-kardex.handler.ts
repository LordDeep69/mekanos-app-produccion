import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaMovimientosInventarioRepository } from '../infrastructure/prisma-movimientos-inventario.repository';
import { GetKardexQuery } from './get-kardex.query';

@QueryHandler(GetKardexQuery)
export class GetKardexHandler implements IQueryHandler<GetKardexQuery> {
  constructor(
    private readonly repository: PrismaMovimientosInventarioRepository,
  ) {}

  async execute(query: GetKardexQuery) {
    const kardex = await this.repository.getKardex(
      query.id_componente,
      query.filters as any,
    );
    return kardex;
  }
}
