import {
  IsInt,
  IsEnum,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO para crear evidencia fotográfica con upload Cloudinary
 * FASE 4.3 - File upload + metadata automática (hash, dimensiones)
 */

export class CreateEvidenciaDto {
  @IsInt()
  id_orden_servicio!: number;

  @IsOptional()
  @IsInt()
  id_actividad_ejecutada?: number;

  @IsEnum([
    'ANTES',
    'DURANTE',
    'DESPUES',
    'DAÑO',
    'TRABAJO_REALIZADO',
    'ENTORNO',
    'MEDICION',
    'COMPONENTE',
  ])
  tipo_evidencia!: string;

  @IsOptional()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  orden_visualizacion?: number;

  @IsOptional()
  es_principal?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;

  // ⚠️ NO incluir en request body (calculados por handler):
  // - nombre_archivo (extraído de file.originalname)
  // - ruta_archivo (Cloudinary secure_url)
  // - hash_sha256 (calculado desde buffer)
  // - tamaño_bytes (file.size)
  // - mime_type (file.mimetype)
  // - ancho_pixels, alto_pixels (Cloudinary response)
  // - capturada_por (userId desde JWT)
}
