import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IMedicionesRepository } from '../../domain/mediciones.repository.interface';
import { ResponseMedicionDto } from '../../dto/response-medicion.dto';
import { MedicionMapper } from '../mappers/medicion.mapper';
import { GetMedicionesByOrdenQuery } from './get-mediciones-by-orden.query';

/**
 * Handler para listar mediciones por orden de servicio + mapper
 * FASE 3 - Refactorizado camelCase - Ordenadas por fecha_medicion DESC
 */

@QueryHandler(GetMedicionesByOrdenQuery)
export class GetMedicionesByOrdenHandler
  implements IQueryHandler<GetMedicionesByOrdenQuery, ResponseMedicionDto[]>
{
  constructor(
    @Inject('IMedicionesRepository')
    private readonly repository: IMedicionesRepository,
    private readonly mapper: MedicionMapper,
  ) {}

  async execute(
    query: GetMedicionesByOrdenQuery,
  ): Promise<ResponseMedicionDto[]> {
    const { ordenId } = query;

    const entities = await this.repository.findByOrden(ordenId);

    return entities.map((entity: any) => this.mapper.toDto(entity));
  }
}
