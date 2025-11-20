import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IDevolucionesProveedorRepository } from '../../domain/devoluciones-proveedor.repository';

/**
 * Query: Obtener lista de devoluciones con filtros
 */
export class GetDevolucionesQuery implements IQuery {
  constructor(
    public readonly filters: {
      estado_devolucion?: string;
      id_orden_compra?: number;
      fecha_desde?: string;
      fecha_hasta?: string;
    },
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}

/**
 * Handler: Procesa la query GetDevolucionesQuery
 * Retorna lista paginada de devoluciones con relaciones
 */
@QueryHandler(GetDevolucionesQuery)
export class GetDevolucionesHandler implements IQueryHandler<GetDevolucionesQuery> {
  constructor(
    @Inject('IDevolucionesProveedorRepository')
    private readonly repository: IDevolucionesProveedorRepository,
  ) {}

  async execute(query: GetDevolucionesQuery): Promise<{ data: any[]; total: number }> {
    const { filters, page, limit } = query;
    return this.repository.findAll(filters, page, limit);
  }
}
