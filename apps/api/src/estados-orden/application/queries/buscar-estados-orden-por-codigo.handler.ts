import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaEstadosOrdenRepository } from '../../infrastructure/prisma-estados-orden.repository';
import { BuscarEstadosOrdenPorCodigoQuery } from './buscar-estados-orden-por-codigo.query';

@QueryHandler(BuscarEstadosOrdenPorCodigoQuery)
export class BuscarEstadosOrdenPorCodigoHandler
  implements IQueryHandler<BuscarEstadosOrdenPorCodigoQuery>
{
  constructor(
    private readonly repository: PrismaEstadosOrdenRepository,
  ) {}

  async execute(query: BuscarEstadosOrdenPorCodigoQuery): Promise<any> {
    // Normalizar código para búsqueda (UPPER)
    const codigoNormalizado = query.codigoEstado.toUpperCase().trim();
    
    const estado = await this.repository.findByCodigo(codigoNormalizado);

    if (!estado) {
      throw new NotFoundException(
        `Estado con código '${codigoNormalizado}' no encontrado`,
      );
    }

    return estado;
  }
}
