import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaEstadosOrdenRepository } from '../../infrastructure/prisma-estados-orden.repository';
import { ListarEstadosOrdenQuery } from './listar-estados-orden.query';

@QueryHandler(ListarEstadosOrdenQuery)
export class ListarEstadosOrdenHandler
  implements IQueryHandler<ListarEstadosOrdenQuery>
{
  constructor(
    private readonly repository: PrismaEstadosOrdenRepository,
  ) {}

  async execute(query: ListarEstadosOrdenQuery): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 50;

    const [data, total] = await Promise.all([
      this.repository.findAll({
        page,
        limit,
        activo: query.activo,
        es_estado_final: query.esEstadoFinal,
        permite_edicion: query.permiteEdicion,
      }),
      this.repository.count({
        activo: query.activo,
        es_estado_final: query.esEstadoFinal,
        permite_edicion: query.permiteEdicion,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
