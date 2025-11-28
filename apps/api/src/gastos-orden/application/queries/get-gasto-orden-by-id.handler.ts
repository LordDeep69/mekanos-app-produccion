import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IGastosOrdenRepository } from '../../domain/gastos-orden.repository.interface';
import { ResponseGastoOrdenDto } from '../../dto/response-gasto-orden.dto';
import { GastoOrdenMapper } from '../mappers/gasto-orden.mapper';
import { GetGastoOrdenByIdQuery } from './get-gasto-orden-by-id.query';

/**
 * Handler: Obtener gasto por ID
 * Tabla 13/14 - FASE 3
 */
@QueryHandler(GetGastoOrdenByIdQuery)
export class GetGastoOrdenByIdHandler implements IQueryHandler<GetGastoOrdenByIdQuery> {
  constructor(
    @Inject('IGastosOrdenRepository')
    private readonly repository: IGastosOrdenRepository,
    private readonly mapper: GastoOrdenMapper,
  ) {}

  async execute(query: GetGastoOrdenByIdQuery): Promise<ResponseGastoOrdenDto> {
    const entity = await this.repository.findById(query.idGasto);
    if (!entity) {
      throw new NotFoundException(`Gasto con ID ${query.idGasto} no encontrado`);
    }
    return this.mapper.toDto(entity);
  }
}
