import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CATALOGO_COMPONENTES_REPOSITORY } from '../../catalogo-componentes.constants';
import { PrismaCatalogoComponentesRepository } from '../../infrastructure/persistence/prisma-catalogo-componentes.repository';
import { GetCatalogoComponentesQuery } from './get-catalogo-componentes.query';

@QueryHandler(GetCatalogoComponentesQuery)
export class GetCatalogoComponentesHandler implements IQueryHandler<GetCatalogoComponentesQuery> {
  constructor(
    @Inject(CATALOGO_COMPONENTES_REPOSITORY)
    private readonly repository: PrismaCatalogoComponentesRepository,
  ) {}

  async execute(query: GetCatalogoComponentesQuery) {
    const { componentes, total } = await this.repository.obtenerTodos(query.filtros);
    return {
      success: true,
      data: {
        componentes,
        count: total,
        filtros: query.filtros,
      },
    };
  }
}
