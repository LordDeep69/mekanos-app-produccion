import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaParametrosMedicionRepository } from '../../infrastructure/prisma-parametros-medicion.repository';
import { ListarParametrosMedicionQuery } from './listar-parametros-medicion.query';

/**
 * Handler: Listar parámetros de medición con filtros y paginación
 * Retorna { data, meta } con metadata de paginación
 */
@Injectable()
@QueryHandler(ListarParametrosMedicionQuery)
export class ListarParametrosMedicionHandler
  implements IQueryHandler<ListarParametrosMedicionQuery>
{
  constructor(
    private readonly repository: PrismaParametrosMedicionRepository,
  ) {}

  async execute(query: ListarParametrosMedicionQuery): Promise<any> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [data, total] = await Promise.all([
      this.repository.findAll({
        activo: query.activo,
        categoria: query.categoria,
        tipoEquipoId: query.tipoEquipoId,
        esCriticoSeguridad: query.esCriticoSeguridad,
        esObligatorio: query.esObligatorio,
        page,
        limit,
      }),
      this.repository.count({
        activo: query.activo,
        categoria: query.categoria,
        tipoEquipoId: query.tipoEquipoId,
        esCriticoSeguridad: query.esCriticoSeguridad,
        esObligatorio: query.esObligatorio,
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
