import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetOrdenesTecnicoQuery } from './get-ordenes-tecnico.query';
import { IOrdenServicioRepository } from '@mekanos/core';

@QueryHandler(GetOrdenesTecnicoQuery)
export class GetOrdenesTecnicoHandler implements IQueryHandler<GetOrdenesTecnicoQuery> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository
  ) {}

  async execute(query: GetOrdenesTecnicoQuery): Promise<any[]> {
    const ordenes = await this.ordenRepository.findByTecnico(query.tecnicoId);

    let filtered = ordenes;
    if (query.estado) {
      filtered = ordenes.filter(o => o.estado.getValue() === query.estado);
    }

    return filtered.map(o => o.toObject());
  }
}
