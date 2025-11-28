import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResponseMedicionDto } from '../../dto/response-medicion.dto';
import { PrismaMedicionesRepository } from '../../infrastructure/prisma-mediciones.repository';
import { MedicionMapper } from '../mappers/medicion.mapper';
import { GetAllMedicionesQuery } from './get-all-mediciones.query';

/**
 * Handler para obtener todas las mediciones - REFACTORIZADO
 * Tabla 10/14 - FASE 3
 */

@QueryHandler(GetAllMedicionesQuery)
export class GetAllMedicionesHandler
  implements IQueryHandler<GetAllMedicionesQuery>
{
  constructor(
    @Inject('IMedicionesRepository')
    private readonly repository: PrismaMedicionesRepository,
    private readonly mapper: MedicionMapper,
  ) {}

  async execute(_query: GetAllMedicionesQuery): Promise<ResponseMedicionDto[]> {
    const entities = await this.repository.findAll();
    return entities.map((entity: any) => this.mapper.toDto(entity));
  }
}
