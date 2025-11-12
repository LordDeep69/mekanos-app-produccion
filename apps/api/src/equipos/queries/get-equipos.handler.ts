import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetEquiposQuery } from './get-equipos.query';
import { IEquipoRepository, EquipoEntity } from '@mekanos/core';

/**
 * Resultado paginado de equipos
 */
export interface GetEquiposResult {
  equipos: EquipoEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Handler para la query GetEquipos
 */
@QueryHandler(GetEquiposQuery)
export class GetEquiposHandler implements IQueryHandler<GetEquiposQuery> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: IEquipoRepository
  ) {}

  async execute(query: GetEquiposQuery): Promise<GetEquiposResult> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filters = {
      clienteId: query.clienteId,
      sedeId: query.sedeId,
      estado: query.estado,
      tipoEquipoId: query.tipoEquipoId,
      skip,
      take: limit
    };

    const [equipos, total] = await Promise.all([
      this.equipoRepository.findAll(filters),
      this.equipoRepository.count(filters)
    ]);

    return {
      equipos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
