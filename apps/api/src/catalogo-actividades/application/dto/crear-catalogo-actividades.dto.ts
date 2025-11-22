import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export enum TipoActividadEnum {
  INSPECCION = 'INSPECCION',
  MEDICION = 'MEDICION',
  LIMPIEZA = 'LIMPIEZA',
  LUBRICACION = 'LUBRICACION',
  AJUSTE = 'AJUSTE',
  REMPLAZO = 'REMPLAZO',
  PRUEBA = 'PRUEBA',
  REPARACION = 'REPARACION',
}

export class CrearCatalogoActividadesDto {
  @ApiProperty({ description: 'Código único de la actividad (se normalizará a MAYÚSCULAS)', example: 'ACT_MOT_001', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  codigoActividad: string;

  @ApiProperty({ description: 'Descripción de la actividad', example: 'Inspección visual del motor' })
  @IsString()
  @IsNotEmpty()
  descripcionActividad: string;

  @ApiProperty({ description: 'ID del tipo de servicio (FK requerido)', example: 1 })
  @IsInt()
  @IsPositive()
  idTipoServicio: number;

  @ApiProperty({ description: 'ID del sistema al que aplica (FK opcional)', example: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idSistema?: number;

  @ApiProperty({ description: 'Tipo de actividad', enum: TipoActividadEnum, example: TipoActividadEnum.INSPECCION })
  @IsEnum(TipoActividadEnum)
  tipoActividad: TipoActividadEnum;

  @ApiProperty({ description: 'Orden de ejecución (debe ser positivo)', example: 1, minimum: 1 })
  @IsInt()
  @IsPositive()
  ordenEjecucion: number;

  @ApiProperty({ description: 'Indica si la actividad es obligatoria', example: true, default: true, required: false })
  @IsBoolean()
  @IsOptional()
  esObligatoria?: boolean;

  @ApiProperty({ description: 'Tiempo estimado en minutos', example: 30, minimum: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  tiempoEstimadoMinutos?: number;

  @ApiProperty({ description: 'ID del parámetro de medición (FK opcional)', example: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idParametroMedicion?: number;

  @ApiProperty({ description: 'ID del tipo de componente (FK opcional)', example: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idTipoComponente?: number;

  @ApiProperty({ description: 'Instrucciones detalladas para ejecutar la actividad', example: 'Verificar conexiones eléctricas...', required: false })
  @IsString()
  @IsOptional()
  instrucciones?: string;

  @ApiProperty({ description: 'Precauciones de seguridad', example: 'Usar guantes dieléctricos', required: false })
  @IsString()
  @IsOptional()
  precauciones?: string;

  @ApiProperty({ description: 'Indica si la actividad está activa', example: true, default: true, required: false })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiProperty({ description: 'Observaciones adicionales', example: 'Actividad crítica de seguridad', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ description: 'ID del usuario que crea el registro (auditoría)', example: 1 })
  @IsInt()
  @IsPositive()
  creadoPor: number;
}
