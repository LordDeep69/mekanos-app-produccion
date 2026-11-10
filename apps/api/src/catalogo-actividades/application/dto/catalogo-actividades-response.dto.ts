import { ApiProperty } from '@nestjs/swagger';
import { TipoActividadEnum } from './crear-catalogo-actividades.dto';

export class CatalogoActividadTipoServicioRelDto {
  @ApiProperty({ example: 1 })
  idTipoServicio: number;

  @ApiProperty({ example: 'ELEV_PREV_A' })
  codigoTipoServicio: string;

  @ApiProperty({ example: 'Mantenimiento Preventivo Tipo A - Ascensor' })
  nombreTipoServicio: string;

  @ApiProperty({ type: [String], required: false, nullable: true })
  aplicaA?: string[] | null;

  @ApiProperty({ required: false, nullable: true })
  idTipoEquipo?: number | null;

  @ApiProperty({ required: false, nullable: true })
  categoria?: string | null;
}

export class CatalogoActividadSistemaRelDto {
  @ApiProperty({ example: 1 })
  idSistema: number;

  @ApiProperty({ example: 'SIS_CABINA' })
  codigoSistema: string;

  @ApiProperty({ example: 'Cabina, Puertas y Operador' })
  nombreSistema: string;

  @ApiProperty({ type: [String], required: false, nullable: true })
  aplicaA?: string[] | null;
}

export class CatalogoActividadParametroRelDto {
  @ApiProperty({ example: 1 })
  idParametroMedicion: number;

  @ApiProperty({ example: 'PAR_DESNIVEL' })
  codigoParametro: string;

  @ApiProperty({ example: 'Desnivel de parada' })
  nombreParametro: string;

  @ApiProperty({ required: false, nullable: true })
  unidadMedida?: string | null;

  @ApiProperty({ required: false, nullable: true })
  valorMinimoNormal?: number | null;

  @ApiProperty({ required: false, nullable: true })
  valorMaximoNormal?: number | null;

  @ApiProperty({ required: false, nullable: true })
  valorMinimoCritico?: number | null;

  @ApiProperty({ required: false, nullable: true })
  valorMaximoCritico?: number | null;

  @ApiProperty({ required: false, nullable: true })
  valorIdeal?: number | null;

  @ApiProperty({ required: false, nullable: true })
  idTipoEquipo?: number | null;
}

export class CatalogoActividadesResponseDto {
  @ApiProperty({ description: 'ID único de la actividad', example: 1 })
  idActividadCatalogo: number;

  @ApiProperty({ description: 'Código único de la actividad', example: 'ACT_MOT_001' })
  codigoActividad: string;

  @ApiProperty({ description: 'Descripción de la actividad', example: 'Inspección visual del motor' })
  descripcionActividad: string;

  @ApiProperty({ description: 'ID del tipo de servicio (null en plantillas del Banco Universal)', example: 1, nullable: true })
  idTipoServicio?: number | null;

  @ApiProperty({ description: 'ID del sistema', example: 1, nullable: true })
  idSistema?: number | null;

  @ApiProperty({ description: 'ID del tipo de equipo base', example: 22, nullable: true, required: false })
  idTipoEquipo?: number | null;

  @ApiProperty({ description: 'ID de plantilla origen en Banco Universal', example: 12, nullable: true, required: false })
  idPlantillaOrigen?: number | null;

  @ApiProperty({ description: 'Tipo de actividad', enum: TipoActividadEnum, example: TipoActividadEnum.INSPECCION })
  tipoActividad: TipoActividadEnum;

  @ApiProperty({ description: 'Orden de ejecución', example: 1 })
  ordenEjecucion: number;

  @ApiProperty({ description: 'Indica si es obligatoria', example: true })
  esObligatoria: boolean;

  @ApiProperty({ description: 'Tiempo estimado en minutos', example: 30, nullable: true })
  tiempoEstimadoMinutos?: number | null;

  @ApiProperty({ description: 'ID del parámetro de medición', example: 1, nullable: true })
  idParametroMedicion?: number | null;

  @ApiProperty({ description: 'ID del tipo de componente', example: 1, nullable: true })
  idTipoComponente?: number | null;

  @ApiProperty({ description: 'Instrucciones', example: 'Verificar conexiones...', nullable: true })
  instrucciones?: string | null;

  @ApiProperty({ description: 'Precauciones', example: 'Usar EPP', nullable: true })
  precauciones?: string | null;

  @ApiProperty({ description: 'Indica si está activa', example: true })
  activo: boolean;

  @ApiProperty({ description: 'Observaciones', example: 'Actividad crítica', nullable: true })
  observaciones?: string | null;

  @ApiProperty({ description: 'Naturaleza personalizada', nullable: true, required: false })
  naturalezaPersonalizada?: string | null;

  @ApiProperty({ description: 'Primitivo de input', required: false })
  tipoControlInput?: string;

  @ApiProperty({ description: 'Config declarativa del input', nullable: true, required: false })
  configInputJson?: any;

  @ApiProperty({ description: 'Rol semántico', nullable: true, required: false })
  rolSemantico?: string | null;

  @ApiProperty({ description: 'ID del usuario creador', example: 1, nullable: true })
  creadoPor?: number | null;

  @ApiProperty({ description: 'Fecha de creación', example: '2025-11-22T10:00:00.000Z' })
  fechaCreacion: Date;

  @ApiProperty({ description: 'ID del usuario modificador', example: 1, nullable: true })
  modificadoPor?: number | null;

  @ApiProperty({ description: 'Fecha de modificación', example: '2025-11-22T12:00:00.000Z', nullable: true })
  fechaModificacion?: Date | null;

  // Relaciones incluidas (opcionales según endpoint)
  @ApiProperty({ type: () => CatalogoActividadTipoServicioRelDto, required: false })
  tipoServicio?: CatalogoActividadTipoServicioRelDto;

  @ApiProperty({ type: () => CatalogoActividadSistemaRelDto, required: false })
  sistema?: CatalogoActividadSistemaRelDto;

  @ApiProperty({ type: () => CatalogoActividadParametroRelDto, required: false })
  parametroMedicion?: CatalogoActividadParametroRelDto;

  @ApiProperty({ required: false, nullable: true })
  tipoEquipo?: {
    idTipoEquipo: number;
    codigoTipo: string;
    nombreTipo: string;
  };
}
