import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResponseActividadDto } from '../../dto/response-actividad.dto';
import { PrismaActividadesRepository } from '../../infrastructure/prisma-actividades.repository';
import { ActividadMapper } from '../mappers/actividad.mapper';
import { GetActividadByIdQuery } from './get-actividad-by-id.query';

@QueryHandler(GetActividadByIdQuery)
export class GetActividadByIdHandler implements IQueryHandler<GetActividadByIdQuery> {
  constructor(
    private readonly repository: PrismaActividadesRepository,
    private readonly mapper: ActividadMapper,
  ) {}

  async execute(query: GetActividadByIdQuery): Promise<ResponseActividadDto> {
    const entity = await this.repository.findById(query.id);

    if (!entity) {
      throw new NotFoundException(`Actividad ${query.id} no encontrada`);
    }

    return this.mapper.toDto(entity);
  }
}

