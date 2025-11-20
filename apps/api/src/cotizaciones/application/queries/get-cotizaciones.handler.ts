import { Injectable, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCotizacionesQuery } from './get-cotizaciones.query';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';

/**
 * GET COTIZACIONES HANDLER
 */
@Injectable()
@QueryHandler(GetCotizacionesQuery)
export class GetCotizacionesHandler implements IQueryHandler<GetCotizacionesQuery> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
  ) {}

  async execute(query: GetCotizacionesQuery): Promise<any> {
    const { cotizaciones, total } = await this.repository.findAll({
      clienteId: query.clienteId,
      sedeId: query.sedeId,
      estadoId: query.estadoId,
      fechaEmisionDesde: query.fechaEmisionDesde,
      fechaEmisionHasta: query.fechaEmisionHasta,
      elaboradaPor: query.elaboradaPor,
      skip: query.skip || 0,
      take: query.take || 50,
    });

    return {
      total,
      page: Math.floor((query.skip || 0) / (query.take || 50)) + 1,
      perPage: query.take || 50,
      cotizaciones,
    };
  }
}
