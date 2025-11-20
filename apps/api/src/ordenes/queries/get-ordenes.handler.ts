import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetOrdenesQuery } from './get-ordenes.query';

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
    private readonly ordenRepository: any // Usa PrismaOrdenServicioRepository directamente (not interfaz)
  ) {}

  async execute(query: GetOrdenesQuery): Promise<PaginatedResponse> {
    const { page, limit, clienteId, equipoId, tecnicoId, prioridad } = query;

    const filters: any = {
      skip: (page - 1) * limit,
      take: limit,
      id_cliente: clienteId,
      id_equipo: equipoId,
      id_tecnico_asignado: tecnicoId,
      // estado y prioridad NO son filtros directos en repository (requieren lookup de IDs)
      // TODO: Agregar resolución de estado string → id_estado_actual
      prioridad,
    };

    // findAll() devuelve { items, total } directamente
    const result = await this.ordenRepository.findAll(filters);

    return {
      ordenes: result.items, // Ya son objetos Prisma serializables
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }
}
