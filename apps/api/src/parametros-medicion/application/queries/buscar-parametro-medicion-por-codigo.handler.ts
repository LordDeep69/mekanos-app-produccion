import { Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaParametrosMedicionRepository } from '../../infrastructure/prisma-parametros-medicion.repository';
import { BuscarParametroMedicionPorCodigoQuery } from './buscar-parametro-medicion-por-codigo.query';

/**
 * Handler: Buscar parámetro de medición por código
 * Normaliza código a UPPER TRIM antes de buscar
 */
@Injectable()
@QueryHandler(BuscarParametroMedicionPorCodigoQuery)
export class BuscarParametroMedicionPorCodigoHandler
  implements IQueryHandler<BuscarParametroMedicionPorCodigoQuery>
{
  constructor(
    private readonly repository: PrismaParametrosMedicionRepository,
  ) {}

  async execute(query: BuscarParametroMedicionPorCodigoQuery): Promise<any> {
    // Normalizar código a UPPER TRIM
    const codigoNormalizado = query.codigoParametro.toUpperCase().trim();

    const parametro = await this.repository.findByCodigo(codigoNormalizado);

    if (!parametro) {
      throw new NotFoundException(
        `Parámetro de medición con código '${codigoNormalizado}' no existe`,
      );
    }

    return parametro;
  }
}
