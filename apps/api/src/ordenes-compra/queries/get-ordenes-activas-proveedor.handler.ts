import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaOrdenesCompraRepository } from '../infrastructure/prisma-ordenes-compra.repository';
import { OrdenCompraResult } from '../interfaces/ordenes-compra.repository.interface';
import { GetOrdenesActivasProveedorQuery } from './get-ordenes-activas-proveedor.query';

@QueryHandler(GetOrdenesActivasProveedorQuery)
export class GetOrdenesActivasProveedorHandler implements IQueryHandler<GetOrdenesActivasProveedorQuery> {
  constructor(private readonly repository: PrismaOrdenesCompraRepository) {}

  async execute(query: GetOrdenesActivasProveedorQuery): Promise<OrdenCompraResult[]> {
    return await this.repository.getOrdenesActivasProveedor(query.id_proveedor);
  }
}
