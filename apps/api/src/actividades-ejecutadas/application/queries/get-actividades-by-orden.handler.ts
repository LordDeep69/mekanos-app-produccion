import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResponseActividadDto } from '../../dto/response-actividad.dto';
import { PrismaActividadesRepository } from '../../infrastructure/prisma-actividades.repository';
import { ActividadMapper } from '../mappers/actividad.mapper';
import { GetActividadesByOrdenQuery } from './get-actividades-by-orden.query';

@QueryHandler(GetActividadesByOrdenQuery)
export class GetActividadesByOrdenHandler implements IQueryHandler<GetActividadesByOrdenQuery> {
  constructor(
    private readonly repository: PrismaActividadesRepository,
    private readonly mapper: ActividadMapper,
  ) {}

  async execute(query: GetActividadesByOrdenQuery): Promise<ResponseActividadDto[]> {
    const entities = await this.repository.findByOrden(query.ordenId);
    return entities.map((entity) => this.mapper.toDto(entity));
  }
}

