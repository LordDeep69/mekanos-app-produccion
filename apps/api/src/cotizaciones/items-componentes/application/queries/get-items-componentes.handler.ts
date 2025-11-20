// Query Handler - Obtener Items Componentes

import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetItemsComponentesQuery } from './get-items-componentes.query';
import { ItemsCotizacionComponentesRepository } from '../../domain/items-cotizacion-componentes.repository.interface';
import { ItemCotizacionComponente } from '../../domain/item-cotizacion-componente.entity';

@Injectable()
@QueryHandler(GetItemsComponentesQuery)
export class GetItemsComponentesHandler
  implements IQueryHandler<GetItemsComponentesQuery>
{
  constructor(
    @Inject('ItemsComponentesRepository')
    private readonly repository: ItemsCotizacionComponentesRepository,
  ) {}

  async execute(
    query: GetItemsComponentesQuery,
  ): Promise<ItemCotizacionComponente[]> {
    return await this.repository.findByCotizacionId(query.idCotizacion, {
      includeComponente: query.includeComponente,
      includeTipoComponente: query.includeTipoComponente,
      includeUsuario: query.includeUsuario,
    });
  }
}
