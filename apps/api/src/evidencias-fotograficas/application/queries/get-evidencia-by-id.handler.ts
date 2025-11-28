import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IEvidenciasRepository } from '../../domain/evidencias.repository.interface';
import { ResponseEvidenciaDto } from '../../dto/response-evidencia.dto';
import { EvidenciaMapper } from '../mappers/evidencia.mapper';
import { GetEvidenciaByIdQuery } from './get-evidencia-by-id.query';

/**
 * Handler obtener evidencia por ID
 * FASE 3 - Tabla 11 - Con mapper
 */

@QueryHandler(GetEvidenciaByIdQuery)
export class GetEvidenciaByIdHandler
  implements IQueryHandler<GetEvidenciaByIdQuery>
{
  constructor(
    @Inject('IEvidenciasRepository')
    private readonly repository: IEvidenciasRepository,
    private readonly mapper: EvidenciaMapper,
  ) {}

  async execute(query: GetEvidenciaByIdQuery): Promise<ResponseEvidenciaDto> {
    const evidencia = await this.repository.findById(query.id);

    if (!evidencia) {
      throw new NotFoundException(
        `Evidencia ID ${query.id} no encontrada`,
      );
    }

    return this.mapper.toDto(evidencia);
  }
}
