import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { COMPONENTES_EQUIPO_REPOSITORY } from '../../componentes-equipo.constants';
import { PrismaComponentesEquipoRepository } from '../../infrastructure/persistence/prisma-componentes-equipo.repository';
import { GetComponentesEquipoQuery } from './get-componentes-equipo.query';

@QueryHandler(GetComponentesEquipoQuery)
export class GetComponentesEquipoHandler implements IQueryHandler<GetComponentesEquipoQuery> {
  constructor(
    @Inject(COMPONENTES_EQUIPO_REPOSITORY)
    private readonly repository: PrismaComponentesEquipoRepository,
  ) {}

  async execute(query: GetComponentesEquipoQuery) {
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
