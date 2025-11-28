import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IGastosOrdenRepository } from '../../domain/gastos-orden.repository.interface';
import { ResponseGastoOrdenDto } from '../../dto/response-gasto-orden.dto';
import { GastoOrdenMapper } from '../mappers/gasto-orden.mapper';
import { GetAllGastosOrdenQuery } from './get-all-gastos-orden.query';

/**
 * Handler: Obtener todos los gastos de orden
 * Tabla 13/14 - FASE 3
 */
@QueryHandler(GetAllGastosOrdenQuery)
export class GetAllGastosOrdenHandler implements IQueryHandler<GetAllGastosOrdenQuery> {
  constructor(
    @Inject('IGastosOrdenRepository')
    private readonly repository: IGastosOrdenRepository,
    private readonly mapper: GastoOrdenMapper,
  ) {}

  async execute(_query: GetAllGastosOrdenQuery): Promise<ResponseGastoOrdenDto[]> {
    const entities = await this.repository.findAll();
    return entities.map((entity) => this.mapper.toDto(entity));
  }
}
