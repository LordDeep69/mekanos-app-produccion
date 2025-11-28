import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IMedicionesRepository } from '../../domain/mediciones.repository.interface';
import { ResponseMedicionDto } from '../../dto/response-medicion.dto';
import { MedicionMapper } from '../mappers/medicion.mapper';
import { GetMedicionByIdQuery } from './get-medicion-by-id.query';

/**
 * Handler para obtener medición por ID con relaciones completas + mapper
 * FASE 3 - Refactorizado camelCase con 3 includes (empleados, ordenes, parametros)
 */

@QueryHandler(GetMedicionByIdQuery)
export class GetMedicionByIdHandler
  implements IQueryHandler<GetMedicionByIdQuery, ResponseMedicionDto>
{
  constructor(
    @Inject('IMedicionesRepository')
    private readonly repository: IMedicionesRepository,
    private readonly mapper: MedicionMapper,
  ) {}

  async execute(query: GetMedicionByIdQuery): Promise<ResponseMedicionDto> {
    const { id } = query;

    const medicion = await this.repository.findById(id);

    if (!medicion) {
      throw new NotFoundException(`Medición ID ${id} no encontrada`);
    }

    return this.mapper.toDto(medicion);
  }
}
