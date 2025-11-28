import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IEvidenciasRepository } from '../../domain/evidencias.repository.interface';
import { ResponseEvidenciaDto } from '../../dto/response-evidencia.dto';
import { EvidenciaMapper } from '../mappers/evidencia.mapper';
import { UpdateEvidenciaCommand } from './update-evidencia.command';

/**
 * Handler actualizar evidencia fotográfica
 * FASE 3 - Tabla 11 - Solo metadatos editables (NO archivo)
 */

@CommandHandler(UpdateEvidenciaCommand)
export class UpdateEvidenciaHandler
  implements ICommandHandler<UpdateEvidenciaCommand>
{
  constructor(
    @Inject('IEvidenciasRepository')
    private readonly repository: IEvidenciasRepository,
    private readonly mapper: EvidenciaMapper,
  ) {}

  async execute(command: UpdateEvidenciaCommand): Promise<ResponseEvidenciaDto> {
    const { id, dto } = command;

    // 1. Validar existencia
    const evidenciaExistente = await this.repository.findById(id);
    if (!evidenciaExistente) {
      throw new NotFoundException(`Evidencia con ID ${id} no encontrada`);
    }

    // 2. Validar dimensiones si se actualizan
    if (
      (dto.anchoPixels !== undefined && dto.altoPixels === undefined) ||
      (dto.anchoPixels === undefined && dto.altoPixels !== undefined)
    ) {
      throw new Error(
        'Dimensiones inválidas: anchoPixels y altoPixels deben ser ambos NULL o ambos >0',
      );
    }

    // 3. Si es_principal=true, desactivar otras principales
    if (dto.esPrincipal === true) {
      await this.repository.desactivarPrincipales(
        evidenciaExistente.id_orden_servicio,
        id, // Excluir esta evidencia
      );
    }

    // 4. Actualizar solo campos provistos (dynamic spread)
    const evidenciaActualizada = await this.repository.update(id, {
      ...(dto.tipoEvidencia !== undefined && { tipoEvidencia: dto.tipoEvidencia }),
      ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      ...(dto.ordenVisualizacion !== undefined && { ordenVisualizacion: dto.ordenVisualizacion }),
      ...(dto.esPrincipal !== undefined && { esPrincipal: dto.esPrincipal }),
      ...(dto.latitud !== undefined && { latitud: dto.latitud }),
      ...(dto.longitud !== undefined && { longitud: dto.longitud }),
      ...(dto.metadataExif !== undefined && { metadataExif: dto.metadataExif }),
      ...(dto.tieneMiniatura !== undefined && { tieneMiniatura: dto.tieneMiniatura }),
      ...(dto.rutaMiniatura !== undefined && { rutaMiniatura: dto.rutaMiniatura }),
      ...(dto.estaComprimida !== undefined && { estaComprimida: dto.estaComprimida }),
      ...(dto.sizeOriginalBytes !== undefined && { sizeOriginalBytes: dto.sizeOriginalBytes }),
    });

    return this.mapper.toDto(evidenciaActualizada);
  }
}
