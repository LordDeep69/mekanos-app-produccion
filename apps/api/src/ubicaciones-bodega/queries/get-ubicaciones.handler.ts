import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaUbicacionesBodegaRepository } from '../infrastructure/prisma-ubicaciones-bodega.repository';
import { GetUbicacionesQuery } from './get-ubicaciones.query';

@QueryHandler(GetUbicacionesQuery)
export class GetUbicacionesHandler implements IQueryHandler<GetUbicacionesQuery> {
  constructor(
    private readonly repository: PrismaUbicacionesBodegaRepository,
  ) {}

  async execute(query: GetUbicacionesQuery) {
    return this.repository.findAll({
      zona: query.zona,
      activo: query.activo,
      page: query.page || 1,
      limit: query.limit || 10,
    });
  }
}
