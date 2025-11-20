import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCotizacionByIdQuery } from './get-cotizacion-by-id.query';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';

/**
 * GET COTIZACION BY ID HANDLER
 */
@Injectable()
@QueryHandler(GetCotizacionByIdQuery)
export class GetCotizacionByIdHandler implements IQueryHandler<GetCotizacionByIdQuery> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
  ) {}

  async execute(query: GetCotizacionByIdQuery): Promise<any> {
    const cotizacion = await this.repository.findById(
      query.id_cotizacion,
      query.includeRelations,
    );

    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${query.id_cotizacion} no encontrada`);
    }

    return cotizacion;
  }
}
