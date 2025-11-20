import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaOrdenesCompraRepository } from '../infrastructure/prisma-ordenes-compra.repository';
import { OrdenesCompraPaginatedResult } from '../interfaces/ordenes-compra.repository.interface';
import { GetOrdenesCompraQuery } from './get-ordenes-compra.query';

@QueryHandler(GetOrdenesCompraQuery)
export class GetOrdenesCompraHandler implements IQueryHandler<GetOrdenesCompraQuery> {
  constructor(private readonly repository: PrismaOrdenesCompraRepository) {}

  async execute(query: GetOrdenesCompraQuery): Promise<OrdenesCompraPaginatedResult> {
    return await this.repository.findAll({
      id_proveedor: query.id_proveedor,
      estado: query.estado,
      fecha_desde: query.fecha_desde,
      fecha_hasta: query.fecha_hasta,
      numero_orden: query.numero_orden,
      page: query.page,
      limit: query.limit,
    });
  }
}
