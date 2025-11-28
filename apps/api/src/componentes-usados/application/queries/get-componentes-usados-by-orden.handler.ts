import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IComponentesUsadosRepository } from '../../domain/componentes-usados.repository.interface';
import { ResponseComponenteUsadoDto } from '../../dto/response-componente-usado.dto';
import { ComponenteUsadoMapper } from '../mappers/componente-usado.mapper';
import { GetComponentesUsadosByOrdenQuery } from './get-componentes-usados-by-orden.query';

/**
 * Handler para obtener componentes usados por orden de servicio
 * Tabla 12/14 - FASE 3
 */
@QueryHandler(GetComponentesUsadosByOrdenQuery)
export class GetComponentesUsadosByOrdenHandler
  implements IQueryHandler<GetComponentesUsadosByOrdenQuery>
{
  constructor(
    @Inject('IComponentesUsadosRepository')
    private readonly repository: IComponentesUsadosRepository,
    private readonly mapper: ComponenteUsadoMapper,
  ) {}

  async execute(query: GetComponentesUsadosByOrdenQuery): Promise<ResponseComponenteUsadoDto[]> {
    const componentes = await this.repository.findByOrden(query.idOrden);
    return componentes.map((c) => this.mapper.toDto(c));
  }
}
