import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetEvidenciaByIdQuery } from './get-evidencia-by-id.query';
import { IEvidenciasRepository } from '../../domain/evidencias.repository.interface';

@QueryHandler(GetEvidenciaByIdQuery)
export class GetEvidenciaByIdHandler
  implements IQueryHandler<GetEvidenciaByIdQuery>
{
  constructor(
    @Inject('IEvidenciasRepository')
    private readonly repository: IEvidenciasRepository,
  ) {}

  async execute(query: GetEvidenciaByIdQuery): Promise<any> {
    const evidencia = await this.repository.findById(query.id_evidencia);

    if (!evidencia) {
      throw new NotFoundException(
        `Evidencia ID ${query.id_evidencia} no encontrada`,
      );
    }

    return evidencia;
  }
}
