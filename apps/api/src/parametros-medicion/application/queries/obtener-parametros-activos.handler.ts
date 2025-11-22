import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaParametrosMedicionRepository } from '../../infrastructure/prisma-parametros-medicion.repository';
import { ObtenerParametrosActivosQuery } from './obtener-parametros-activos.query';

/**
 * Handler: Obtener solo parámetros activos
 * Retorna array sin paginación, ordenado por categoría + código
 */
@Injectable()
@QueryHandler(ObtenerParametrosActivosQuery)
export class ObtenerParametrosActivosHandler
  implements IQueryHandler<ObtenerParametrosActivosQuery>
{
  constructor(
    private readonly repository: PrismaParametrosMedicionRepository,
  ) {}

  async execute(_query: ObtenerParametrosActivosQuery): Promise<any> {
    return this.repository.findActivos();
  }
}
