import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetOrdenesQuery } from './get-ordenes.query';
import { IOrdenServicioRepository, FindOrdenesFilters } from '@mekanos/core';

interface PaginatedResponse {
  ordenes: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(GetOrdenesQuery)
export class GetOrdenesHandler implements IQueryHandler<GetOrdenesQuery> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository
  ) {}

  async execute(query: GetOrdenesQuery): Promise<PaginatedResponse> {
    const { page, limit, clienteId, equipoId, tecnicoId, estado, prioridad } = query;

    const filters: FindOrdenesFilters = {
      skip: (page - 1) * limit,
      take: limit,
      clienteId,
      equipoId,
      tecnicoAsignadoId: tecnicoId,
      estado,
      prioridad
    };

    const [ordenes, total] = await Promise.all([
      this.ordenRepository.findAll(filters),
      this.ordenRepository.count(filters)
    ]);

    return {
      ordenes: ordenes.map(o => o.toObject()),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
