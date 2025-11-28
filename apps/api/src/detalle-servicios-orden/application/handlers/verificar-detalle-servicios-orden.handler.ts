import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IDetalleServiciosOrdenRepository } from '../../domain/detalle-servicios-orden.repository.interface';
import { DetalleServiciosOrdenResponseDto } from '../dto/detalle-servicios-orden-response.dto';

export class VerificarDetalleServiciosOrdenQuery {
  constructor(public readonly id: number) {}
}

@QueryHandler(VerificarDetalleServiciosOrdenQuery)
export class VerificarDetalleServiciosOrdenHandler implements IQueryHandler<VerificarDetalleServiciosOrdenQuery> {
  constructor(
    @Inject('IDetalleServiciosOrdenRepository')
    private readonly repository: IDetalleServiciosOrdenRepository,
  ) {}

  async execute(query: VerificarDetalleServiciosOrdenQuery): Promise<DetalleServiciosOrdenResponseDto> {
    const { id } = query;

    // ✅ Verificar sin filtrar por estado (incluye CANCELADO)
    const detalle = await this.repository.verificarPorId(id);

    if (!detalle) {
      throw new NotFoundException(`Detalle de servicio con ID ${id} no encontrado`);
    }

    return detalle;
  }
}
