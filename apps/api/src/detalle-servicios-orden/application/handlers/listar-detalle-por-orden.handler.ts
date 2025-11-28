import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IDetalleServiciosOrdenRepository } from '../../domain/detalle-servicios-orden.repository.interface';
import { DetalleServiciosOrdenResponseDto } from '../dto/detalle-servicios-orden-response.dto';

export class ListarDetallePorOrdenQuery {
  constructor(
    public readonly idOrdenServicio: number,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}

@QueryHandler(ListarDetallePorOrdenQuery)
export class ListarDetallePorOrdenHandler implements IQueryHandler<ListarDetallePorOrdenQuery> {
  constructor(
    @Inject('IDetalleServiciosOrdenRepository')
    private readonly repository: IDetalleServiciosOrdenRepository,
  ) {}

  async execute(query: ListarDetallePorOrdenQuery): Promise<{
    data: DetalleServiciosOrdenResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { idOrdenServicio, page, limit } = query;
    const skip = (page - 1) * limit;

    const [detalles, total] = await Promise.all([
      this.repository.listarPorOrden(idOrdenServicio, skip, limit),
      this.repository.contarPorOrden(idOrdenServicio),
    ]);

    return {
      data: detalles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
