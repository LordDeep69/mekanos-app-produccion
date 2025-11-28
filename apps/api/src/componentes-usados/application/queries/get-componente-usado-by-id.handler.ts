import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IComponentesUsadosRepository } from '../../domain/componentes-usados.repository.interface';
import { ResponseComponenteUsadoDto } from '../../dto/response-componente-usado.dto';
import { ComponenteUsadoMapper } from '../mappers/componente-usado.mapper';
import { GetComponenteUsadoByIdQuery } from './get-componente-usado-by-id.query';

/**
 * Handler para obtener componente usado por ID
 * Tabla 12/14 - FASE 3
 */
@QueryHandler(GetComponenteUsadoByIdQuery)
export class GetComponenteUsadoByIdHandler
  implements IQueryHandler<GetComponenteUsadoByIdQuery>
{
  constructor(
    @Inject('IComponentesUsadosRepository')
    private readonly repository: IComponentesUsadosRepository,
    private readonly mapper: ComponenteUsadoMapper,
  ) {}

  async execute(query: GetComponenteUsadoByIdQuery): Promise<ResponseComponenteUsadoDto> {
    const componente = await this.repository.findById(query.id);
    
    if (!componente) {
      throw new NotFoundException(`Componente usado con ID ${query.id} no encontrado`);
    }

    return this.mapper.toDto(componente);
  }
}
