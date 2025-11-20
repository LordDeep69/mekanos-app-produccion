import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { COMPONENTES_EQUIPO_REPOSITORY } from '../../componentes-equipo.constants';
import { PrismaComponentesEquipoRepository } from '../../infrastructure/persistence/prisma-componentes-equipo.repository';
import { GetComponenteEquipoByIdQuery } from './get-componente-equipo-by-id.query';

@QueryHandler(GetComponenteEquipoByIdQuery)
export class GetComponenteEquipoByIdHandler implements IQueryHandler<GetComponenteEquipoByIdQuery> {
  constructor(
    @Inject(COMPONENTES_EQUIPO_REPOSITORY)
    private readonly repository: PrismaComponentesEquipoRepository,
  ) {}

  async execute(query: GetComponenteEquipoByIdQuery) {
    const componente = await this.repository.obtenerPorId(query.id);
    if (!componente) {
      throw new NotFoundException(`Componente-Equipo ${query.id} no encontrado`);
    }
    return {
      success: true,
      data: componente,
    };
  }
}
