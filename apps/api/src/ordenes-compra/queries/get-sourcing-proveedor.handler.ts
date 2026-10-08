import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaOrdenesCompraRepository } from '../infrastructure/prisma-ordenes-compra.repository';
import { ArticuloSourcingResult } from '../interfaces/ordenes-compra.repository.interface';
import { GetSourcingProveedorQuery } from './get-sourcing-proveedor.query';

@QueryHandler(GetSourcingProveedorQuery)
export class GetSourcingProveedorHandler implements IQueryHandler<GetSourcingProveedorQuery> {
  constructor(private readonly repository: PrismaOrdenesCompraRepository) {}

  async execute(query: GetSourcingProveedorQuery): Promise<ArticuloSourcingResult[]> {
    return await this.repository.getSourcingProveedor(query.idProveedor);
  }
}
