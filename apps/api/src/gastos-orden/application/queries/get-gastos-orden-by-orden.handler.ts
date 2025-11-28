import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IGastosOrdenRepository } from '../../domain/gastos-orden.repository.interface';
import { ResponseGastoOrdenDto } from '../../dto/response-gasto-orden.dto';
import { GastoOrdenMapper } from '../mappers/gasto-orden.mapper';
import { GetGastosOrdenByOrdenQuery } from './get-gastos-orden-by-orden.query';

/**
 * Handler: Obtener gastos por orden de servicio
 * Tabla 13/14 - FASE 3
 */
@QueryHandler(GetGastosOrdenByOrdenQuery)
export class GetGastosOrdenByOrdenHandler implements IQueryHandler<GetGastosOrdenByOrdenQuery> {
  constructor(
    @Inject('IGastosOrdenRepository')
    private readonly repository: IGastosOrdenRepository,
    private readonly mapper: GastoOrdenMapper,
  ) {}

  async execute(query: GetGastosOrdenByOrdenQuery): Promise<ResponseGastoOrdenDto[]> {
    const entities = await this.repository.findByOrdenServicio(query.idOrdenServicio);
    return entities.map((entity) => this.mapper.toDto(entity));
  }
}
