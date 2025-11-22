import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CatalogoActividadesRepository } from '../../domain/catalogo-actividades.repository.interface';
import { CatalogoActividadesMapper } from '../../infrastructure/catalogo-actividades.mapper';
import { CatalogoActividadesResponseDto } from '../dto/catalogo-actividades-response.dto';

export class ObtenerCatalogoActividadesPorIdQuery {
  constructor(public readonly id: number) {}
}

@QueryHandler(ObtenerCatalogoActividadesPorIdQuery)
export class ObtenerCatalogoActividadesPorIdHandler implements IQueryHandler<ObtenerCatalogoActividadesPorIdQuery> {
  constructor(
    @Inject('CatalogoActividadesRepository')
    private readonly repository: CatalogoActividadesRepository,
  ) {}

  async execute(query: ObtenerCatalogoActividadesPorIdQuery): Promise<CatalogoActividadesResponseDto> {
    const entity = await this.repository.findById(query.id);
    if (!entity) {
      throw new NotFoundException(`Actividad con ID ${query.id} no encontrada`);
    }

    return CatalogoActividadesMapper.toCamelCase(entity);
  }
}
