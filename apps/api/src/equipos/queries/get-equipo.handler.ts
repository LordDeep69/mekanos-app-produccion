import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException, Inject } from '@nestjs/common';
import { GetEquipoQuery } from './get-equipo.query';
import { IEquipoRepository, EquipoEntity, EquipoId } from '@mekanos/core';

/**
 * Handler para la query GetEquipo
 */
@QueryHandler(GetEquipoQuery)
export class GetEquipoHandler implements IQueryHandler<GetEquipoQuery> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: IEquipoRepository
  ) {}

  async execute(query: GetEquipoQuery): Promise<EquipoEntity> {
    const { equipoId } = query;

    const equipo = await this.equipoRepository.findById(EquipoId.from(equipoId));
    
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${equipoId} no encontrado`);
    }

    return equipo;
  }
}
