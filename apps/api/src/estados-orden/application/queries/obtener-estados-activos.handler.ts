import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaEstadosOrdenRepository } from '../../infrastructure/prisma-estados-orden.repository';
import { ObtenerEstadosActivosQuery } from './obtener-estados-activos.query';

@QueryHandler(ObtenerEstadosActivosQuery)
export class ObtenerEstadosActivosHandler
  implements IQueryHandler<ObtenerEstadosActivosQuery>
{
  constructor(
    private readonly repository: PrismaEstadosOrdenRepository,
  ) {}

  async execute(_query: ObtenerEstadosActivosQuery): Promise<any> {
    return this.repository.findActivos();
  }
}
