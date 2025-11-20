import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetActividadesByOrdenQuery } from './get-actividades-by-orden.query';
import { PrismaActividadesRepository } from '../../infrastructure/prisma-actividades.repository';

/**
 * Handler para obtener actividades por orden
 * Ordenadas por: orden_secuencia ASC, fecha_ejecucion ASC
 */

@QueryHandler(GetActividadesByOrdenQuery)
export class GetActividadesByOrdenHandler
  implements IQueryHandler<GetActividadesByOrdenQuery>
{
  constructor(
    @Inject('IActividadesRepository')
    private readonly repository: PrismaActividadesRepository,
  ) {}

  async execute(query: GetActividadesByOrdenQuery): Promise<any[]> {
    return await this.repository.findByOrden(query.ordenId);
  }
}
