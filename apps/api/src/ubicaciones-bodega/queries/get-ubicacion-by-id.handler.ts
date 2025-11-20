import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaUbicacionesBodegaRepository } from '../infrastructure/prisma-ubicaciones-bodega.repository';
import { GetUbicacionByIdQuery } from './get-ubicacion-by-id.query';

@QueryHandler(GetUbicacionByIdQuery)
export class GetUbicacionByIdHandler implements IQueryHandler<GetUbicacionByIdQuery> {
  constructor(
    private readonly repository: PrismaUbicacionesBodegaRepository,
  ) {}

  async execute(query: GetUbicacionByIdQuery) {
    const ubicacion = await this.repository.findById(query.id_ubicacion);

    if (!ubicacion) {
      throw new NotFoundException(
        `Ubicación ${query.id_ubicacion} no encontrada`,
      );
    }

    return ubicacion;
  }
}
