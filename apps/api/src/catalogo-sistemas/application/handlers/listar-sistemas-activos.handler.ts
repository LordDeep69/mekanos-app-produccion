import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { CatalogoSistemasMapper } from '../../infrastructure/catalogo-sistemas.mapper';
import { CatalogoSistemasResponseDto } from '../dto/catalogo-sistemas-response.dto';

export class ListarSistemasActivosQuery {}

@QueryHandler(ListarSistemasActivosQuery)
export class ListarSistemasActivosHandler implements IQueryHandler<ListarSistemasActivosQuery> {
  constructor(
    @Inject('ICatalogoSistemasRepository')
    private readonly repository: ICatalogoSistemasRepository,
    private readonly mapper: CatalogoSistemasMapper,
  ) {}

  async execute(): Promise<CatalogoSistemasResponseDto[]> {
    const sistemas = await this.repository.findActivos();
    return this.mapper.toCamelCaseList(sistemas);
  }
}
