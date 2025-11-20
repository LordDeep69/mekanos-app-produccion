import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CATALOGO_COMPONENTES_REPOSITORY } from '../../catalogo-componentes.constants';
import { PrismaCatalogoComponentesRepository } from '../../infrastructure/persistence/prisma-catalogo-componentes.repository';
import { GetCatalogoComponenteByIdQuery } from './get-catalogo-componente-by-id.query';

@QueryHandler(GetCatalogoComponenteByIdQuery)
export class GetCatalogoComponenteByIdHandler implements IQueryHandler<GetCatalogoComponenteByIdQuery> {
  constructor(
    @Inject(CATALOGO_COMPONENTES_REPOSITORY)
    private readonly repository: PrismaCatalogoComponentesRepository,
  ) {}

  async execute(query: GetCatalogoComponenteByIdQuery) {
    const componente = await this.repository.obtenerPorId(query.id);
    if (!componente) {
      throw new NotFoundException(`Componente ${query.id} no encontrado`);
    }
    return {
      success: true,
      data: componente,
    };
  }
}
