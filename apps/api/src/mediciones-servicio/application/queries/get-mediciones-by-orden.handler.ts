import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetMedicionesByOrdenQuery } from './get-mediciones-by-orden.query';
import { IMedicionesRepository } from '../../domain/mediciones.repository.interface';

/**
 * Handler para listar mediciones por orden de servicio
 * FASE 4.2 - Ordenadas por fecha_medicion DESC (más recientes primero)
 */

@QueryHandler(GetMedicionesByOrdenQuery)
export class GetMedicionesByOrdenHandler
  implements IQueryHandler<GetMedicionesByOrdenQuery>
{
  constructor(
    @Inject('IMedicionesRepository')
    private readonly repository: IMedicionesRepository,
  ) {}

  async execute(query: GetMedicionesByOrdenQuery): Promise<any> {
    const { id_orden_servicio } = query;

    const mediciones =
      await this.repository.findByOrden(id_orden_servicio);

    return {
      total: mediciones.length,
      mediciones,
    };
  }
}
