import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { CreateEvidenciaCommand } from './create-evidencia.command';
import { IEvidenciasRepository } from '../../domain/evidencias.repository.interface';
import { CloudinaryService } from '../../../cloudinary/cloudinary.service';

/**
 * Handler crear evidencia con UPLOAD REAL a Cloudinary
 * FASE 4.3 - Hash SHA256 + dimensiones + URL Cloudinary
 */

@CommandHandler(CreateEvidenciaCommand)
export class CreateEvidenciaHandler
  implements ICommandHandler<CreateEvidenciaCommand>
{
  constructor(
    @Inject('IEvidenciasRepository')
    private readonly repository: IEvidenciasRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async execute(command: CreateEvidenciaCommand): Promise<any> {
    const { dto, file, userId } = command;

    // 1. Validar file upload
    if (!file || !file.buffer) {
      throw new BadRequestException('Archivo de imagen requerido');
    }

    // 2. Calcular hash SHA256 del archivo original
    const hash = createHash('sha256').update(file.buffer).digest('hex');

    // 3. Upload a Cloudinary
    const folder = `mekanos/evidencias/orden-${dto.id_orden_servicio}`;
    let cloudinaryResult;

    try {
      cloudinaryResult = await this.cloudinaryService.uploadImage(
        file.buffer,
        folder,
      );
    } catch (error: any) {
      throw new BadRequestException(
        `Error al subir imagen a Cloudinary: ${error?.message || 'Unknown error'}`,
      );
    }

    // 4. Generar thumbnail URL
    const thumbnailUrl = this.cloudinaryService.generateThumbnailUrl(
      cloudinaryResult.public_id,
    );

    // 5. Guardar evidencia con metadata completa
    const evidencia = await this.repository.save({
      id_orden_servicio: dto.id_orden_servicio,
      id_actividad_ejecutada: dto.id_actividad_ejecutada ?? null,
      tipo_evidencia: dto.tipo_evidencia,
      descripcion: dto.descripcion ?? null,
      nombre_archivo: file.originalname,
      ruta_archivo: cloudinaryResult.secure_url, // ✅ URL Cloudinary
      hash_sha256: hash,
      tama_o_bytes: BigInt(file.size),
      mime_type: file.mimetype,
      ancho_pixels: cloudinaryResult.width,
      alto_pixels: cloudinaryResult.height,
      orden_visualizacion: dto.orden_visualizacion ?? 1,
      es_principal: dto.es_principal ?? false,
      fecha_captura: new Date(),
      capturada_por: userId, // Usuario desde JWT
      latitud: dto.latitud ?? null,
      longitud: dto.longitud ?? null,
      metadata_exif: null, // TODO: Extraer EXIF si necesario
      tiene_miniatura: true,
      ruta_miniatura: thumbnailUrl,
      esta_comprimida: true, // Cloudinary comprime automáticamente
      tama_o_original_bytes: BigInt(file.size),
    });

    // Serializar BigInt antes de retornar (JSON no soporta BigInt nativamente)
    return {
      ...evidencia,
      tama_o_bytes: Number(evidencia.tama_o_bytes),
      tama_o_original_bytes: evidencia.tama_o_original_bytes
        ? Number(evidencia.tama_o_original_bytes)
        : null,
    };
  }
}
