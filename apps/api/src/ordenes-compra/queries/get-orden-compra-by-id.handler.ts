import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaOrdenesCompraRepository } from '../infrastructure/prisma-ordenes-compra.repository';
import { OrdenCompraResult } from '../interfaces/ordenes-compra.repository.interface';
import { GetOrdenCompraByIdQuery } from './get-orden-compra-by-id.query';

@QueryHandler(GetOrdenCompraByIdQuery)
export class GetOrdenCompraByIdHandler implements IQueryHandler<GetOrdenCompraByIdQuery> {
  constructor(private readonly repository: PrismaOrdenesCompraRepository) {}

  async execute(query: GetOrdenCompraByIdQuery): Promise<OrdenCompraResult> {
    return await this.repository.findById(query.id_orden_compra);
  }
}
