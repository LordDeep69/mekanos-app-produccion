import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IEvidenciasRepository } from '../../domain/evidencias.repository.interface';
import { ResponseEvidenciaDto } from '../../dto/response-evidencia.dto';
import { EvidenciaMapper } from '../mappers/evidencia.mapper';
import { CreateEvidenciaCommand } from './create-evidencia.command';

/**
 * Handler crear evidencia fotográfica
 * FASE 3 - Tabla 11 - CRUD Estándar con mapper
 * Backend responsabilidad: validar dimensiones, gestionar es_principal único
 */

@CommandHandler(CreateEvidenciaCommand)
export class CreateEvidenciaHandler
  implements ICommandHandler<CreateEvidenciaCommand>
{
  constructor(
    @Inject('IEvidenciasRepository')
    private readonly repository: IEvidenciasRepository,
    private readonly mapper: EvidenciaMapper,
  ) {}

  async execute(command: CreateEvidenciaCommand): Promise<ResponseEvidenciaDto> {
    const { dto, userId } = command;

    // 1. Validar dimensiones (ambos NULL o ambos >0)
    if (
      (dto.anchoPixels !== undefined && dto.altoPixels === undefined) ||
      (dto.anchoPixels === undefined && dto.altoPixels !== undefined)
    ) {
      throw new Error(
        'Dimensiones inválidas: anchoPixels y altoPixels deben ser ambos NULL o ambos >0',
      );
    }

    // 2. Si es_principal=true, desactivar otras principales de esta orden
    if (dto.esPrincipal === true) {
      await this.repository.desactivarPrincipales(dto.idOrdenServicio);
    }

    // 3. Crear evidencia
    const evidencia = await this.repository.create({
      idOrdenServicio: dto.idOrdenServicio,
      idActividadEjecutada: dto.idActividadEjecutada ?? null,
      tipoEvidencia: dto.tipoEvidencia,
      descripcion: dto.descripcion ?? null,
      nombreArchivo: dto.nombreArchivo,
      rutaArchivo: dto.rutaArchivo,
      hashSha256: dto.hashSha256,
      sizeBytes: dto.sizeBytes,
      mimeType: dto.mimeType ?? 'image/jpeg',
      anchoPixels: dto.anchoPixels ?? null,
      altoPixels: dto.altoPixels ?? null,
      ordenVisualizacion: dto.ordenVisualizacion ?? null,
      esPrincipal: dto.esPrincipal ?? false,
      capturadaPor: userId, // Usuario desde JWT
      latitud: dto.latitud ?? null,
      longitud: dto.longitud ?? null,
      metadataExif: dto.metadataExif ?? null,
      tieneMiniatura: dto.tieneMiniatura ?? false,
      rutaMiniatura: dto.rutaMiniatura ?? null,
      estaComprimida: dto.estaComprimida ?? false,
      sizeOriginalBytes: dto.sizeOriginalBytes ?? null,
    });

    return this.mapper.toDto(evidencia);
  }
}

