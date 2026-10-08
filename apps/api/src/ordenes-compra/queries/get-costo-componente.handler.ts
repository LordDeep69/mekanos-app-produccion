import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaOrdenesCompraRepository } from '../infrastructure/prisma-ordenes-compra.repository';
import { CostoComponenteResult } from '../interfaces/ordenes-compra.repository.interface';
import { GetCostoComponenteQuery } from './get-costo-componente.query';

@QueryHandler(GetCostoComponenteQuery)
export class GetCostoComponenteHandler implements IQueryHandler<GetCostoComponenteQuery> {
  constructor(private readonly repository: PrismaOrdenesCompraRepository) {}

  async execute(query: GetCostoComponenteQuery): Promise<CostoComponenteResult> {
    return await this.repository.getCostoComponente(query.idProveedor, query.idComponente);
  }
}
