import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetActividadByIdQuery } from './get-actividad-by-id.query';
import { PrismaActividadesRepository } from '../../infrastructure/prisma-actividades.repository';

/**
 * Handler para obtener actividad por ID
 */

@QueryHandler(GetActividadByIdQuery)
export class GetActividadByIdHandler
  implements IQueryHandler<GetActividadByIdQuery>
{
  constructor(
    @Inject('IActividadesRepository')
    private readonly repository: PrismaActividadesRepository,
  ) {}

  async execute(query: GetActividadByIdQuery): Promise<any> {
    const actividad = await this.repository.findById(query.id);

    if (!actividad) {
      throw new NotFoundException(`Actividad ${query.id} no encontrada`);
    }

    return actividad;
  }
}
