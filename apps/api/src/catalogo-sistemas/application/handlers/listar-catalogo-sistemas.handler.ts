import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { CatalogoSistemasMapper } from '../../infrastructure/catalogo-sistemas.mapper';
import { CatalogoSistemasResponseDto } from '../dto/catalogo-sistemas-response.dto';

export class ListarCatalogoSistemasQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}

@QueryHandler(ListarCatalogoSistemasQuery)
export class ListarCatalogoSistemasHandler implements IQueryHandler<ListarCatalogoSistemasQuery> {
  constructor(
    @Inject('ICatalogoSistemasRepository')
    private readonly repository: ICatalogoSistemasRepository,
    private readonly mapper: CatalogoSistemasMapper,
  ) {}

  async execute(query: ListarCatalogoSistemasQuery): Promise<{
    data: CatalogoSistemasResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { data, total } = await this.repository.findAll(query.page, query.limit);

    return {
      data: this.mapper.toCamelCaseList(data),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
      },
    };
  }
}
