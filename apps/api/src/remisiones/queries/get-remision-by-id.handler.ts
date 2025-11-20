import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaRemisionesRepository } from '../infrastructure/prisma-remisiones.repository';
import { GetRemisionByIdQuery } from './get-remision-by-id.query';

@QueryHandler(GetRemisionByIdQuery)
export class GetRemisionByIdHandler
  implements IQueryHandler<GetRemisionByIdQuery>
{
  constructor(private readonly repository: PrismaRemisionesRepository) {}

  async execute(query: GetRemisionByIdQuery) {
    const remision = await this.repository.findById(query.id_remision);

    if (!remision) {
      throw new NotFoundException(
        `Remisión ID ${query.id_remision} no encontrada`,
      );
    }

    return remision;
  }
}
