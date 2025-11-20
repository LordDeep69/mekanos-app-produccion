import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaRemisionesRepository } from '../infrastructure/prisma-remisiones.repository';
import { GetRemisionesQuery } from './get-remisiones.query';

@QueryHandler(GetRemisionesQuery)
export class GetRemisionesHandler implements IQueryHandler<GetRemisionesQuery> {
  constructor(private readonly repository: PrismaRemisionesRepository) {}

  async execute(query: GetRemisionesQuery) {
    const result = await this.repository.findAll(query.filters);
    return result;
  }
}
