import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { COMPONENTES_EQUIPO_REPOSITORY } from '../../componentes-equipo.constants';
import { PrismaComponentesEquipoRepository } from '../../infrastructure/persistence/prisma-componentes-equipo.repository';
import { GetComponentesPorEquipoQuery } from './get-componentes-por-equipo.query';

@QueryHandler(GetComponentesPorEquipoQuery)
export class GetComponentesPorEquipoHandler implements IQueryHandler<GetComponentesPorEquipoQuery> {
  constructor(
    @Inject(COMPONENTES_EQUIPO_REPOSITORY)
    private readonly repository: PrismaComponentesEquipoRepository,
  ) {}

  async execute(query: GetComponentesPorEquipoQuery) {
    const componentes = await this.repository.obtenerPorEquipo(query.idEquipo);
    return {
      success: true,
      data: {
        componentes,
        count: componentes.length,
        id_equipo: query.idEquipo,
      },
    };
  }
}
