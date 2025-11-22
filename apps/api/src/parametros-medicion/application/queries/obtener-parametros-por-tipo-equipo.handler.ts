import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaParametrosMedicionRepository } from '../../infrastructure/prisma-parametros-medicion.repository';
import { ObtenerParametrosPorTipoEquipoQuery } from './obtener-parametros-por-tipo-equipo.query';

/**
 * Handler: Obtener parámetros de medición por tipo de equipo
 * Retorna solo activos ordenados por categoría + obligatoriedad + código
 */
@Injectable()
@QueryHandler(ObtenerParametrosPorTipoEquipoQuery)
export class ObtenerParametrosPorTipoEquipoHandler
  implements IQueryHandler<ObtenerParametrosPorTipoEquipoQuery>
{
  constructor(
    private readonly repository: PrismaParametrosMedicionRepository,
  ) {}

  async execute(query: ObtenerParametrosPorTipoEquipoQuery): Promise<any> {
    return this.repository.findByTipoEquipo(query.tipoEquipoId);
  }
}
