import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { TipoActividadEnum } from './crear-catalogo-actividades.dto';

export class ActualizarCatalogoActividadesDto {
  @ApiProperty({ description: 'Código de actividad', required: false })
  @IsString()
  @IsOptional()
  codigoActividad?: string;

  @ApiProperty({ description: 'Descripción de la actividad', example: 'Inspección actualizada', required: false })
  @IsString()
  @IsOptional()
  descripcionActividad?: string;

  @ApiProperty({ description: 'ID del tipo de servicio (null para plantilla pura)', required: false, nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idTipoServicio?: number | null;

  @ApiProperty({ description: 'ID del sistema al que aplica', example: 2, required: false, nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idSistema?: number | null;

  @ApiProperty({ description: 'ID del tipo de equipo / arquetipo', required: false, nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idTipoEquipo?: number | null;

  @ApiProperty({ description: 'Tipo de actividad', enum: TipoActividadEnum, required: false })
  @IsEnum(TipoActividadEnum)
  @IsOptional()
  tipoActividad?: TipoActividadEnum;

  @ApiProperty({ description: 'Orden de ejecución', example: 2, minimum: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  ordenEjecucion?: number;

  @ApiProperty({ description: 'Indica si la actividad es obligatoria', example: false, required: false })
  @IsBoolean()
  @IsOptional()
  esObligatoria?: boolean;

  @ApiProperty({ description: 'Tiempo estimado en minutos', example: 45, minimum: 1, required: false, nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  tiempoEstimadoMinutos?: number | null;

  @ApiProperty({ description: 'ID del parámetro de medición', example: 2, required: false, nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idParametroMedicion?: number | null;

  @ApiProperty({ description: 'ID del tipo de componente', example: 2, required: false, nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idTipoComponente?: number | null;

  @ApiProperty({ description: 'Instrucciones detalladas', example: 'Instrucciones actualizadas', required: false, nullable: true })
  @IsString()
  @IsOptional()
  instrucciones?: string | null;

  @ApiProperty({ description: 'Precauciones de seguridad', example: 'Precauciones actualizadas', required: false, nullable: true })
  @IsString()
  @IsOptional()
  precauciones?: string | null;

  @ApiProperty({ description: 'Indica si la actividad está activa', example: false, required: false })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiProperty({ description: 'Observaciones adicionales', example: 'Observaciones actualizadas', required: false, nullable: true })
  @IsString()
  @IsOptional()
  observaciones?: string | null;

  @ApiProperty({ description: 'Naturaleza técnica personalizada', required: false, nullable: true })
  @IsString()
  @IsOptional()
  naturalezaPersonalizada?: string | null;

  @ApiProperty({ description: 'Modo de respuesta / primitivo de input', required: false })
  @IsString()
  @IsOptional()
  tipoControlInput?: string;

  @ApiProperty({ description: 'Configuración declarativa del input', required: false, nullable: true })
  @IsOptional()
  configInputJson?: any;

  @ApiProperty({ description: 'Rol semántico', required: false, nullable: true })
  @IsString()
  @IsOptional()
  rolSemantico?: string | null;

  @ApiProperty({ description: 'ID del usuario que modifica el registro (auditoría, opcional)', example: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  modificadoPor?: number;
}
