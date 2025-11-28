import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { CatalogoSistemasMapper } from '../../infrastructure/catalogo-sistemas.mapper';
import { CatalogoSistemasResponseDto } from '../dto/catalogo-sistemas-response.dto';

export class ObtenerCatalogoSistemasPorCodigoQuery {
  constructor(public readonly codigoSistema: string) {}
}

@QueryHandler(ObtenerCatalogoSistemasPorCodigoQuery)
export class ObtenerCatalogoSistemasPorCodigoHandler implements IQueryHandler<ObtenerCatalogoSistemasPorCodigoQuery> {
  constructor(
    @Inject('ICatalogoSistemasRepository')
    private readonly repository: ICatalogoSistemasRepository,
    private readonly mapper: CatalogoSistemasMapper,
  ) {}

  async execute(query: ObtenerCatalogoSistemasPorCodigoQuery): Promise<CatalogoSistemasResponseDto> {
    const sistema = await this.repository.findByCodigo(query.codigoSistema);

    if (!sistema) {
      throw new NotFoundException(
        `Sistema con código '${query.codigoSistema.toUpperCase()}' no encontrado`,
      );
    }

    return this.mapper.toCamelCase(sistema);
  }
}
