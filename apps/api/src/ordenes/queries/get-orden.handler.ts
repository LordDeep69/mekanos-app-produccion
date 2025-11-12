import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetOrdenQuery } from './get-orden.query';
import { IOrdenServicioRepository, OrdenServicioId } from '@mekanos/core';

@QueryHandler(GetOrdenQuery)
export class GetOrdenHandler implements IQueryHandler<GetOrdenQuery> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository
  ) {}

  async execute(query: GetOrdenQuery): Promise<any> {
    const orden = await this.ordenRepository.findById(OrdenServicioId.from(query.ordenId));
    
    if (!orden) {
      throw new NotFoundException(`Orden con ID ${query.ordenId} no encontrada`);
    }

    return orden.toObject();
  }
}
