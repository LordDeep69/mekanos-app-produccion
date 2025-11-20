import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CATALOGO_SISTEMAS_REPOSITORY } from '../../catalogo-sistemas.constants';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { GetCatalogoSistemaByIdQuery } from './get-catalogo-sistema-by-id.query';

@QueryHandler(GetCatalogoSistemaByIdQuery)
export class GetCatalogoSistemaByIdHandler
  implements IQueryHandler<GetCatalogoSistemaByIdQuery>
{
  constructor(
    @Inject(CATALOGO_SISTEMAS_REPOSITORY)
    private readonly repository: ICatalogoSistemasRepository,
  ) {}

  async execute(query: GetCatalogoSistemaByIdQuery) {
    const sistema = await this.repository.findById(query.id_sistema);

    if (!sistema) {
      throw new NotFoundException(
        `Sistema con id ${query.id_sistema} no encontrado`,
      );
    }

    return sistema;
  }
}
