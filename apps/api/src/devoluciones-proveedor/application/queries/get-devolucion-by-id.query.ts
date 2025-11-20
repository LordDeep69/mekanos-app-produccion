import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IDevolucionesProveedorRepository } from '../../domain/devoluciones-proveedor.repository';

/**
 * Query: Obtener devolución por ID
 */
export class GetDevolucionByIdQuery implements IQuery {
  constructor(public readonly id_devolucion: number) {}
}

/**
 * Handler: Procesa la query GetDevolucionByIdQuery
 * Retorna devolución completa con todas sus relaciones
 */
@QueryHandler(GetDevolucionByIdQuery)
export class GetDevolucionByIdHandler implements IQueryHandler<GetDevolucionByIdQuery> {
  constructor(
    @Inject('IDevolucionesProveedorRepository')
    private readonly repository: IDevolucionesProveedorRepository,
  ) {}

  async execute(query: GetDevolucionByIdQuery): Promise<any> {
    return this.repository.findById(query.id_devolucion);
  }
}
