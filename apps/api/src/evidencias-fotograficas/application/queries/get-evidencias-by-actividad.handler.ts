import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IEvidenciasRepository } from '../../domain/evidencias.repository.interface';
import { ResponseEvidenciaDto } from '../../dto/response-evidencia.dto';
import { EvidenciaMapper } from '../mappers/evidencia.mapper';
import { GetEvidenciasByActividadQuery } from './get-evidencias-by-actividad.query';

/**
 * Handler listar evidencias por actividad ejecutada
 * FASE 3 - Tabla 11 - Con mapper
 */

@QueryHandler(GetEvidenciasByActividadQuery)
export class GetEvidenciasByActividadHandler
  implements IQueryHandler<GetEvidenciasByActividadQuery>
{
  constructor(
    @Inject('IEvidenciasRepository')
    private readonly repository: IEvidenciasRepository,
    private readonly mapper: EvidenciaMapper,
  ) {}

  async execute(query: GetEvidenciasByActividadQuery): Promise<ResponseEvidenciaDto[]> {
    const evidencias = await this.repository.findByActividad(query.actividadId);
    return evidencias.map((ev) => this.mapper.toDto(ev));
  }
}
