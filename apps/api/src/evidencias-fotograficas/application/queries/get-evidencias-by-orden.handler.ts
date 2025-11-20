import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetEvidenciasByOrdenQuery } from './get-evidencias-by-orden.query';
import { IEvidenciasRepository } from '../../domain/evidencias.repository.interface';

@QueryHandler(GetEvidenciasByOrdenQuery)
export class GetEvidenciasByOrdenHandler
  implements IQueryHandler<GetEvidenciasByOrdenQuery>
{
  constructor(
    @Inject('IEvidenciasRepository')
    private readonly repository: IEvidenciasRepository,
  ) {}

  async execute(query: GetEvidenciasByOrdenQuery): Promise<any> {
    const evidencias = await this.repository.findByOrden(
      query.id_orden_servicio,
    );

    // Serializar BigInt en evidencias
    const evidenciasSerializadas = evidencias.map((ev: any) => ({
      ...ev,
      tama_o_bytes: ev.tama_o_bytes ? Number(ev.tama_o_bytes) : null,
      tama_o_original_bytes: ev.tama_o_original_bytes
        ? Number(ev.tama_o_original_bytes)
        : null,
    }));

    return {
      total: evidenciasSerializadas.length,
      evidencias: evidenciasSerializadas,
    };
  }
}
