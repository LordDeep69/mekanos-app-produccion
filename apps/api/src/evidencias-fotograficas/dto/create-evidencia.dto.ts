import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { TipoEvidenciaEnum } from '../application/enums/tipo-evidencia.enum';

/**
 * DTO para crear evidencia fotográfica
 * FASE 3 - Tabla 11 - CRUD con upload + hash SHA256
 * Backend responsabilidad: hash_sha256 (crypto), dimensiones (si no vienen), ordenVisualizacion auto
 */

export class CreateEvidenciaDto {
  @ApiProperty({ description: 'ID orden servicio (FK)', example: 1 })
  @IsInt()
  idOrdenServicio!: number;

  @ApiPropertyOptional({ description: 'ID actividad ejecutada (FK)', example: 1 })
  @IsOptional()
  @IsInt()
  idActividadEjecutada?: number;

  @ApiProperty({ enum: TipoEvidenciaEnum, description: 'Tipo evidencia (8 valores)' })
  @IsEnum(TipoEvidenciaEnum)
  tipoEvidencia!: TipoEvidenciaEnum;

  @ApiPropertyOptional({ description: 'Descripción evidencia', maxLength: 500 })
  @IsOptional()
  @MaxLength(500)
  descripcion?: string;

  @ApiProperty({ description: 'Nombre archivo', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  nombreArchivo!: string;

  @ApiProperty({ description: 'Ruta archivo (URL Cloudinary)', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  rutaArchivo!: string;

  @ApiProperty({ description: 'Hash SHA256 (64 caracteres)', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  hashSha256!: string;

  @ApiProperty({ description: 'Tamaño archivo bytes (BigInt) - usar sizeBytes', example: 1024000 })
  @IsNumber()
  @Min(1)
  @Expose({ name: 'sizeBytes' })
  @Transform(({ obj }) => obj.sizeBytes || obj.tamañoBytes || obj['tama\u00f1oBytes'])
  sizeBytes!: number;

  @ApiPropertyOptional({ description: 'MIME type', maxLength: 50, default: 'image/jpeg' })
  @IsOptional()
  @MaxLength(50)
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Ancho pixels', example: 1920 })
  @IsOptional()
  @IsInt()
  @Min(1)
  anchoPixels?: number;

  @ApiPropertyOptional({ description: 'Alto pixels', example: 1080 })
  @IsOptional()
  @IsInt()
  @Min(1)
  altoPixels?: number;

  @ApiPropertyOptional({ description: 'Orden visualización', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  ordenVisualizacion?: number;

  @ApiPropertyOptional({ description: 'Es foto principal', default: false })
  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;

  @ApiPropertyOptional({ description: 'Latitud (-90 a 90)', example: 4.6097 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({ description: 'Longitud (-180 a 180)', example: -74.0817 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;

  @ApiPropertyOptional({ description: 'Metadata EXIF (JSON)', example: {} })
  @IsOptional()
  metadataExif?: any;

  @ApiPropertyOptional({ description: 'Tiene miniatura', default: false })
  @IsOptional()
  @IsBoolean()
  tieneMiniatura?: boolean;

  @ApiPropertyOptional({ description: 'Ruta miniatura', maxLength: 500 })
  @IsOptional()
  @MaxLength(500)
  rutaMiniatura?: string;

  @ApiPropertyOptional({ description: 'Está comprimida', default: false })
  @IsOptional()
  @IsBoolean()
  estaComprimida?: boolean;

  @ApiPropertyOptional({ description: 'Tamaño original bytes (BigInt) - usar sizeOriginalBytes', example: 2048000 })
  @IsOptional()
  @IsNumber()
  @Expose({ name: 'sizeOriginalBytes' })
  @Transform(({ obj }) => obj.sizeOriginalBytes || obj.tamañoOriginalBytes || obj['tama\u00f1oOriginalBytes'])
  sizeOriginalBytes?: number;

  // ⚠️ Campos calculados automáticamente:
  // - capturadaPor (userId desde JWT)
  // - fechaCaptura (CURRENT_TIMESTAMP)
  // - fechaRegistro (CURRENT_TIMESTAMP)
}
