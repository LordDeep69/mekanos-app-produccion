import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IEvidenciasRepository } from '../../domain/evidencias.repository.interface';
import { ResponseEvidenciaDto } from '../../dto/response-evidencia.dto';
import { EvidenciaMapper } from '../mappers/evidencia.mapper';
import { GetEvidenciasByOrdenQuery } from './get-evidencias-by-orden.query';

/**
 * Handler listar evidencias por orden
 * FASE 3 - Tabla 11 - Con mapper
 */

@QueryHandler(GetEvidenciasByOrdenQuery)
export class GetEvidenciasByOrdenHandler
  implements IQueryHandler<GetEvidenciasByOrdenQuery>
{
  constructor(
    @Inject('IEvidenciasRepository')
    private readonly repository: IEvidenciasRepository,
    private readonly mapper: EvidenciaMapper,
  ) {}

  async execute(query: GetEvidenciasByOrdenQuery): Promise<ResponseEvidenciaDto[]> {
    const evidencias = await this.repository.findByOrden(query.ordenId);
    return evidencias.map((ev) => this.mapper.toDto(ev));
  }
}
