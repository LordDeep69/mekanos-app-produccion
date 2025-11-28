import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IEvidenciasRepository } from '../../domain/evidencias.repository.interface';
import { ResponseEvidenciaDto } from '../../dto/response-evidencia.dto';
import { EvidenciaMapper } from '../mappers/evidencia.mapper';
import { GetAllEvidenciasQuery } from './get-all-evidencias.query';

/**
 * Handler obtener todas evidencias
 * FASE 3 - Tabla 11 - Con mapper
 */

@QueryHandler(GetAllEvidenciasQuery)
export class GetAllEvidenciasHandler
  implements IQueryHandler<GetAllEvidenciasQuery>
{
  constructor(
    @Inject('IEvidenciasRepository')
    private readonly repository: IEvidenciasRepository,
    private readonly mapper: EvidenciaMapper,
  ) {}

  async execute(): Promise<ResponseEvidenciaDto[]> {
    const evidencias = await this.repository.findAll();
    return evidencias.map((ev) => this.mapper.toDto(ev));
  }
}
