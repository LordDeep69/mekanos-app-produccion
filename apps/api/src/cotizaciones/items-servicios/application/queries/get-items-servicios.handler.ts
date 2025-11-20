// Query Handler - Obtener Items Servicios

import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetItemsServiciosQuery } from './get-items-servicios.query';
import { ItemsCotizacionServiciosRepository } from '../../domain/items-cotizacion-servicios.repository.interface';
import { ItemCotizacionServicio } from '../../domain/item-cotizacion-servicio.entity';

@Injectable()
@QueryHandler(GetItemsServiciosQuery)
export class GetItemsServiciosHandler
  implements IQueryHandler<GetItemsServiciosQuery>
{
  constructor(
    @Inject('ItemsServiciosRepository')
    private readonly repository: ItemsCotizacionServiciosRepository,
  ) {}

  async execute(
    query: GetItemsServiciosQuery,
  ): Promise<ItemCotizacionServicio[]> {
    return await this.repository.findByCotizacionId(query.idCotizacion, {
      includeServicio: query.includeServicio,
      includeUsuario: query.includeUsuario,
    });
  }
}
