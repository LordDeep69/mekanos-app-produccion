import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IDetalleServiciosOrdenRepository } from '../../domain/detalle-servicios-orden.repository.interface';
import { DetalleServiciosOrdenResponseDto } from '../dto/detalle-servicios-orden-response.dto';

export class ListarDetalleServiciosOrdenQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}

@QueryHandler(ListarDetalleServiciosOrdenQuery)
export class ListarDetalleServiciosOrdenHandler implements IQueryHandler<ListarDetalleServiciosOrdenQuery> {
  constructor(
    @Inject('IDetalleServiciosOrdenRepository')
    private readonly repository: IDetalleServiciosOrdenRepository,
  ) {}

  async execute(query: ListarDetalleServiciosOrdenQuery): Promise<{
    data: DetalleServiciosOrdenResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [detalles, total] = await Promise.all([
      this.repository.listar(skip, limit),
      this.repository.contar(),
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
