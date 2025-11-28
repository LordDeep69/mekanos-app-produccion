import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min
} from 'class-validator';

/**
 * ENUM categoria_servicio_enum (desde Prisma schema)
 */
export enum CategoriaServicioEnum {
  PREVENTIVO = 'PREVENTIVO',
  CORRECTIVO = 'CORRECTIVO',
  EMERGENCIA = 'EMERGENCIA',
  INSPECCION = 'INSPECCION',
  ESPECIALIZADO = 'ESPECIALIZADO',
  DIAGNOSTICO = 'DIAGNOSTICO',
}

/**
 * DTO: Crear tipo de servicio
 * 
 * Validaciones con class-validator
 * Documentación con Swagger
 */
export class CreateTiposServicioDto {
  @ApiProperty({
    description: 'Código único del tipo de servicio',
    example: 'GEN_PREV_A',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigoTipo: string;

  @ApiProperty({
    description: 'Nombre del tipo de servicio',
    example: 'Mantenimiento Preventivo Generador Tipo A',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombreTipo: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del tipo de servicio',
    example: 'Mantenimiento preventivo completo para generadores diesel...',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'Categoría del servicio',
    enum: CategoriaServicioEnum,
    example: CategoriaServicioEnum.PREVENTIVO,
  })
  @IsEnum(CategoriaServicioEnum)
  @IsNotEmpty()
  categoria: CategoriaServicioEnum;

  @ApiPropertyOptional({
    description: 'ID del tipo de equipo al que aplica',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  tipoEquipoId?: number;

  @ApiPropertyOptional({
    description: 'Indica si tiene checklist de actividades',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  tieneChecklist?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si tiene plantilla de informe',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  tienePlantillaInforme?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si requiere mediciones técnicas',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  requiereMediciones?: boolean;

  @ApiPropertyOptional({
    description: 'Duración estimada en horas',
    example: 4.5,
    minimum: 0.01,
  })
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  duracionEstimadaHoras?: number;

  @ApiPropertyOptional({
    description: 'Orden de visualización en UI',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  ordenVisualizacion?: number;

  @ApiPropertyOptional({
    description: 'Icono para UI (nombre Material Icons)',
    example: 'build',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icono?: string;

  @ApiPropertyOptional({
    description: 'Color hexadecimal para UI',
    example: '#FF5722',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color debe ser formato hexadecimal (#RRGGBB)',
  })
  colorHex?: string;

  @ApiPropertyOptional({
    description: 'Estado activo/inactivo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiPropertyOptional({
    description: 'Observaciones adicionales',
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
