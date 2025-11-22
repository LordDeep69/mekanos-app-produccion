import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CatalogoActividadesRepository } from '../../domain/catalogo-actividades.repository.interface';
import { CatalogoActividadesMapper } from '../../infrastructure/catalogo-actividades.mapper';
import { CatalogoActividadesResponseDto } from '../dto/catalogo-actividades-response.dto';

export class ObtenerCatalogoActividadesPorCodigoQuery {
  constructor(public readonly codigo: string) {}
}

@QueryHandler(ObtenerCatalogoActividadesPorCodigoQuery)
export class ObtenerCatalogoActividadesPorCodigoHandler implements IQueryHandler<ObtenerCatalogoActividadesPorCodigoQuery> {
  constructor(
    @Inject('CatalogoActividadesRepository')
    private readonly repository: CatalogoActividadesRepository,
  ) {}

  async execute(query: ObtenerCatalogoActividadesPorCodigoQuery): Promise<CatalogoActividadesResponseDto> {
    const codigoNormalizado = query.codigo.toUpperCase().trim();
    const entity = await this.repository.findByCodigo(codigoNormalizado);
    
    if (!entity) {
      throw new NotFoundException(`Actividad con código ${codigoNormalizado} no encontrada`);
    }

    return CatalogoActividadesMapper.toCamelCase(entity);
  }
}
