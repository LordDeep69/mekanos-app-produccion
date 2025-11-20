import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetMedicionByIdQuery } from './get-medicion-by-id.query';
import { IMedicionesRepository } from '../../domain/mediciones.repository.interface';

/**
 * Handler para obtener medición por ID con relaciones completas
 * FASE 4.2 - Retorna medicion con orden, parámetro (rangos), empleado
 */

@QueryHandler(GetMedicionByIdQuery)
export class GetMedicionByIdHandler
  implements IQueryHandler<GetMedicionByIdQuery>
{
  constructor(
    @Inject('IMedicionesRepository')
    private readonly repository: IMedicionesRepository,
  ) {}

  async execute(query: GetMedicionByIdQuery): Promise<any> {
    const { id_medicion } = query;

    const medicion = await this.repository.findById(id_medicion);

    if (!medicion) {
      throw new NotFoundException(
        `Medición ID ${id_medicion} no encontrada`,
      );
    }

    return medicion;
  }
}
