import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { HistorialEstadosOrdenRepositoryInterface } from '../../domain/historial-estados-orden.repository.interface';

export class ObtenerHistorialEstadosOrdenPorIdQuery {
  constructor(public readonly id: number) {}
}

@QueryHandler(ObtenerHistorialEstadosOrdenPorIdQuery)
export class ObtenerHistorialEstadosOrdenPorIdHandler
  implements IQueryHandler<ObtenerHistorialEstadosOrdenPorIdQuery>
{
  constructor(
    @Inject('HistorialEstadosOrdenRepositoryInterface')
    private readonly repository: HistorialEstadosOrdenRepositoryInterface,
  ) {}

  async execute(query: ObtenerHistorialEstadosOrdenPorIdQuery): Promise<any> {
    const historial = await this.repository.obtenerPorId(query.id);

    if (!historial) {
      throw new NotFoundException(
        `Historial de estado con ID ${query.id} no encontrado`,
      );
    }

    return historial;
  }
}
