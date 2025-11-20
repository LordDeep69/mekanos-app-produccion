import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetEquiposQuery } from './get-equipos.query';
import { PrismaEquipoRepository } from '../infrastructure/prisma-equipo.repository';

/**
 * Resultado paginado de equipos
 */
export interface GetEquiposResult {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Handler para la query GetEquipos
 * ✅ FASE 2: Usa PrismaEquipoRepository con campos snake_case
 */
@QueryHandler(GetEquiposQuery)
export class GetEquiposHandler implements IQueryHandler<GetEquiposQuery> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: PrismaEquipoRepository
  ) {}

  async execute(query: GetEquiposQuery): Promise<GetEquiposResult> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filters = {
      id_cliente: query.id_cliente,
      id_sede: query.id_sede,
      estado_equipo: query.estado_equipo,
      id_tipo_equipo: query.id_tipo_equipo,
      activo: query.activo !== undefined ? query.activo : true, // Por defecto solo activos
      skip,
      take: limit
    };

    // findAll retorna { items, total }
    const { items, total } = await this.equipoRepository.findAll(filters);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
