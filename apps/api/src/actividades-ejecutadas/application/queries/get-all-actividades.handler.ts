import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResponseActividadDto } from '../../dto/response-actividad.dto';
import { PrismaActividadesRepository } from '../../infrastructure/prisma-actividades.repository';
import { ActividadMapper } from '../mappers/actividad.mapper';
import { GetAllActividadesQuery } from './get-all-actividades.query';

@QueryHandler(GetAllActividadesQuery)
export class GetAllActividadesHandler implements IQueryHandler<GetAllActividadesQuery> {
  constructor(
    private readonly repository: PrismaActividadesRepository,
    private readonly mapper: ActividadMapper,
  ) {}

  async execute(_query: GetAllActividadesQuery): Promise<ResponseActividadDto[]> {
    const entities = await this.repository.findAll();
    return entities.map((entity) => this.mapper.toDto(entity));
  }
}
