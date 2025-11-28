import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaEstadosOrdenRepository } from '../../infrastructure/prisma-estados-orden.repository';
import { ObtenerEstadosOrdenPorIdQuery } from './obtener-estados-orden-por-id.query';

@QueryHandler(ObtenerEstadosOrdenPorIdQuery)
export class ObtenerEstadosOrdenPorIdHandler
  implements IQueryHandler<ObtenerEstadosOrdenPorIdQuery>
{
  constructor(
    private readonly repository: PrismaEstadosOrdenRepository,
  ) {}

  async execute(query: ObtenerEstadosOrdenPorIdQuery): Promise<any> {
    const estado = await this.repository.findById(query.idEstado);

    if (!estado) {
      throw new NotFoundException(
        `Estado con ID ${query.idEstado} no encontrado`,
      );
    }

    return estado;
  }
}
