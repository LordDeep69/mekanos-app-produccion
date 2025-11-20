import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ITiposEquipoRepository } from '../../domain/tipos-equipo.repository.interface';
import { TIPOS_EQUIPO_REPOSITORY } from '../../tipos-equipo.constants';
import { GetTiposEquipoQuery } from './get-tipos-equipo.query';

@QueryHandler(GetTiposEquipoQuery)
export class GetTiposEquipoHandler
  implements IQueryHandler<GetTiposEquipoQuery>
{
  constructor(
    @Inject(TIPOS_EQUIPO_REPOSITORY)
    private readonly repository: ITiposEquipoRepository,
  ) {}

  async execute(query: GetTiposEquipoQuery) {
    return this.repository.findAll({
      page: query.page,
      limit: query.limit,
      categoria: query.categoria,
      activo: query.activo,
      disponible: query.disponible,
      tiene_motor: query.tiene_motor,
      tiene_generador: query.tiene_generador,
      tiene_bomba: query.tiene_bomba,
    });
  }
}
