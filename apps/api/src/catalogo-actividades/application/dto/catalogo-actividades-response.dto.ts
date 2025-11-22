import { ApiProperty } from '@nestjs/swagger';
import { TipoActividadEnum } from './crear-catalogo-actividades.dto';

export class CatalogoActividadesResponseDto {
  @ApiProperty({ description: 'ID único de la actividad', example: 1 })
  idActividadCatalogo: number;

  @ApiProperty({ description: 'Código único de la actividad', example: 'ACT_MOT_001' })
  codigoActividad: string;

  @ApiProperty({ description: 'Descripción de la actividad', example: 'Inspección visual del motor' })
  descripcionActividad: string;

  @ApiProperty({ description: 'ID del tipo de servicio', example: 1 })
  idTipoServicio: number;

  @ApiProperty({ description: 'ID del sistema', example: 1, nullable: true })
  idSistema?: number | null;

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

  @ApiProperty({ description: 'ID del usuario creador', example: 1, nullable: true })
  creadoPor?: number | null;

  @ApiProperty({ description: 'Fecha de creación', example: '2025-11-22T10:00:00.000Z' })
  fechaCreacion: Date;

  @ApiProperty({ description: 'ID del usuario modificador', example: 1, nullable: true })
  modificadoPor?: number | null;

  @ApiProperty({ description: 'Fecha de modificación', example: '2025-11-22T12:00:00.000Z', nullable: true })
  fechaModificacion?: Date | null;

  // Relaciones incluidas (opcionales según endpoint)
  @ApiProperty({ description: 'Tipo de servicio relacionado', required: false })
  tipoServicio?: {
    idTipoServicio: number;
    codigoTipoServicio: string;
    nombreTipoServicio: string;
  };

  @ApiProperty({ description: 'Sistema relacionado', required: false })
  sistema?: {
    idSistema: number;
    codigoSistema: string;
    nombreSistema: string;
  };
}
