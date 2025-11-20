import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException, Inject } from '@nestjs/common';
import { GetEquipoQuery } from './get-equipo.query';
import { PrismaEquipoRepository } from '../infrastructure/prisma-equipo.repository';

/**
 * Handler para la query GetEquipo
 * ✅ FASE 2: Usa PrismaEquipoRepository con id_equipo
 */
@QueryHandler(GetEquipoQuery)
export class GetEquipoHandler implements IQueryHandler<GetEquipoQuery> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: PrismaEquipoRepository
  ) {}

  async execute(query: GetEquipoQuery): Promise<any> {
    const { equipoId } = query;

    const equipo = await this.equipoRepository.findById(equipoId);
    
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${equipoId} no encontrado`);
    }

    return equipo;
  }
}
