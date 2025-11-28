import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IDetalleServiciosOrdenRepository } from '../../domain/detalle-servicios-orden.repository.interface';
import { DetalleServiciosOrdenResponseDto } from '../dto/detalle-servicios-orden-response.dto';

export class ObtenerDetalleServiciosOrdenPorIdQuery {
  constructor(public readonly id: number) {}
}

@QueryHandler(ObtenerDetalleServiciosOrdenPorIdQuery)
export class ObtenerDetalleServiciosOrdenPorIdHandler implements IQueryHandler<ObtenerDetalleServiciosOrdenPorIdQuery> {
  constructor(
    @Inject('IDetalleServiciosOrdenRepository')
    private readonly repository: IDetalleServiciosOrdenRepository,
  ) {}

  async execute(query: ObtenerDetalleServiciosOrdenPorIdQuery): Promise<DetalleServiciosOrdenResponseDto> {
    const { id } = query;

    const detalle = await this.repository.encontrarPorIdDetallado(id);

    if (!detalle) {
      throw new NotFoundException(`Detalle de servicio con ID ${id} no encontrado`);
    }

    return detalle;
  }
}
