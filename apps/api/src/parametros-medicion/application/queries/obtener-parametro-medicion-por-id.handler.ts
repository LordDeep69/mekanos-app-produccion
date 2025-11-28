import { Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaParametrosMedicionRepository } from '../../infrastructure/prisma-parametros-medicion.repository';
import { ObtenerParametroMedicionPorIdQuery } from './obtener-parametro-medicion-por-id.query';

/**
 * Handler: Obtener parámetro de medición por ID
 * Retorna parámetro con relaciones completas o NotFoundException
 */
@Injectable()
@QueryHandler(ObtenerParametroMedicionPorIdQuery)
export class ObtenerParametroMedicionPorIdHandler
  implements IQueryHandler<ObtenerParametroMedicionPorIdQuery>
{
  constructor(
    private readonly repository: PrismaParametrosMedicionRepository,
  ) {}

  async execute(query: ObtenerParametroMedicionPorIdQuery): Promise<any> {
    const parametro = await this.repository.findById(query.id);

    if (!parametro) {
      throw new NotFoundException(
        `Parámetro de medición con ID ${query.id} no existe`,
      );
    }

    return parametro;
  }
}
