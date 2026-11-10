import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export enum TipoActividadEnum {
  INSPECCION = 'INSPECCION',
  MEDICION = 'MEDICION',
  LIMPIEZA = 'LIMPIEZA',
  LUBRICACION = 'LUBRICACION',
  AJUSTE = 'AJUSTE',
  CAMBIO = 'CAMBIO',
  PRUEBA = 'PRUEBA',
  VERIFICACION = 'VERIFICACION',
}

export class CrearCatalogoActividadesDto {
  @ApiProperty({ description: 'Código de actividad (opcional: si se omite, se autogenera único)', example: 'ACT_MOT_001', maxLength: 50, required: false })
  @IsString()
  @IsOptional()
  codigoActividad?: string;

  @ApiProperty({ description: 'Descripción de la actividad', example: 'Inspección visual del motor' })
  @IsString()
  @IsNotEmpty()
  descripcionActividad: string;

  @ApiProperty({ description: 'ID del tipo de servicio (opcional: NULL para plantillas puras del Banco Universal)', example: 1, required: false, nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idTipoServicio?: number | null;

  @ApiProperty({ description: 'ID del subsistema / sistema al que aplica (FK opcional)', example: 1, required: false, nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idSistema?: number | null;

  @ApiProperty({ description: 'ID del tipo de equipo / arquetipo (FK opcional para Banco Universal)', example: 22, required: false, nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idTipoEquipo?: number | null;

  @ApiProperty({ description: 'ID de plantilla origen en Banco Universal (opcional)', required: false, nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idPlantillaOrigen?: number | null;

  @ApiProperty({ description: 'Tipo de actividad', enum: TipoActividadEnum, example: TipoActividadEnum.INSPECCION })
  @IsEnum(TipoActividadEnum)
  tipoActividad: TipoActividadEnum;

  @ApiProperty({ description: 'Orden de ejecución (opcional: si se omite se calcula automáticamente)', example: 1, minimum: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  ordenEjecucion?: number;

  @ApiProperty({ description: 'Indica si la actividad es obligatoria', example: true, default: true, required: false })
  @IsBoolean()
  @IsOptional()
  esObligatoria?: boolean;

  @ApiProperty({ description: 'Tiempo estimado en minutos', example: 30, minimum: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  tiempoEstimadoMinutos?: number | null;

  @ApiProperty({ description: 'ID del parámetro de medición (FK opcional)', example: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idParametroMedicion?: number | null;

  @ApiProperty({ description: 'ID del tipo de componente (FK opcional)', example: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  idTipoComponente?: number | null;

  @ApiProperty({ description: 'Instrucciones detalladas para ejecutar la actividad', example: 'Verificar conexiones eléctricas...', required: false })
  @IsString()
  @IsOptional()
  instrucciones?: string | null;

  @ApiProperty({ description: 'Precauciones de seguridad', example: 'Usar guantes dieléctricos', required: false })
  @IsString()
  @IsOptional()
  precauciones?: string | null;

  @ApiProperty({ description: 'Indica si la actividad está activa', example: true, default: true, required: false })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiProperty({ description: 'Observaciones adicionales', example: 'Actividad crítica de seguridad', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string | null;

  @ApiProperty({ description: 'ID del usuario que crea el registro (auditoría, opcional)', example: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  creadoPor?: number;
}
