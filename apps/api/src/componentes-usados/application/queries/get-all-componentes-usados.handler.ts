import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IComponentesUsadosRepository } from '../../domain/componentes-usados.repository.interface';
import { ResponseComponenteUsadoDto } from '../../dto/response-componente-usado.dto';
import { ComponenteUsadoMapper } from '../mappers/componente-usado.mapper';
import { GetAllComponentesUsadosQuery } from './get-all-componentes-usados.query';

/**
 * Handler para obtener todos los componentes usados
 * Tabla 12/14 - FASE 3
 */
@QueryHandler(GetAllComponentesUsadosQuery)
export class GetAllComponentesUsadosHandler
  implements IQueryHandler<GetAllComponentesUsadosQuery>
{
  constructor(
    @Inject('IComponentesUsadosRepository')
    private readonly repository: IComponentesUsadosRepository,
    private readonly mapper: ComponenteUsadoMapper,
  ) {}

  async execute(_query: GetAllComponentesUsadosQuery): Promise<ResponseComponenteUsadoDto[]> {
    const componentes = await this.repository.findAll();
    return componentes.map((c) => this.mapper.toDto(c));
  }
}
