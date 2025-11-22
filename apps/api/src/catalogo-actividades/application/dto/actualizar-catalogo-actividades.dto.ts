import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { TipoActividadEnum } from './crear-catalogo-actividades.dto';

export class ActualizarCatalogoActividadesDto {
  @ApiProperty({ description: 'Descripción de la actividad', example: 'Inspección actualizada', required: false })
  @IsString()
  @IsOptional()
  descripcionActividad?: string;

  @ApiProperty({ description: 'ID del sistema al que aplica', example: 2, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idSistema?: number;

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

  @ApiProperty({ description: 'Tiempo estimado en minutos', example: 45, minimum: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  tiempoEstimadoMinutos?: number;

  @ApiProperty({ description: 'ID del parámetro de medición', example: 2, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idParametroMedicion?: number;

  @ApiProperty({ description: 'ID del tipo de componente', example: 2, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idTipoComponente?: number;

  @ApiProperty({ description: 'Instrucciones detalladas', example: 'Instrucciones actualizadas', required: false })
  @IsString()
  @IsOptional()
  instrucciones?: string;

  @ApiProperty({ description: 'Precauciones de seguridad', example: 'Precauciones actualizadas', required: false })
  @IsString()
  @IsOptional()
  precauciones?: string;

  @ApiProperty({ description: 'Indica si la actividad está activa', example: false, required: false })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiProperty({ description: 'Observaciones adicionales', example: 'Observaciones actualizadas', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ description: 'ID del usuario que modifica el registro (auditoría)', example: 1 })
  @IsInt()
  @IsPositive()
  modificadoPor: number;
}
