import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { CatalogoSistemasMapper } from '../../infrastructure/catalogo-sistemas.mapper';
import { CatalogoSistemasResponseDto } from '../dto/catalogo-sistemas-response.dto';

export class ObtenerCatalogoSistemasPorIdQuery {
  constructor(public readonly idSistema: number) {}
}

@QueryHandler(ObtenerCatalogoSistemasPorIdQuery)
export class ObtenerCatalogoSistemasPorIdHandler implements IQueryHandler<ObtenerCatalogoSistemasPorIdQuery> {
  constructor(
    @Inject('ICatalogoSistemasRepository')
    private readonly repository: ICatalogoSistemasRepository,
    private readonly mapper: CatalogoSistemasMapper,
  ) {}

  async execute(query: ObtenerCatalogoSistemasPorIdQuery): Promise<CatalogoSistemasResponseDto> {
    const sistema = await this.repository.findById(query.idSistema);

    if (!sistema) {
      throw new NotFoundException(`Sistema con ID ${query.idSistema} no encontrado`);
    }

    return this.mapper.toCamelCase(sistema);
  }
}
