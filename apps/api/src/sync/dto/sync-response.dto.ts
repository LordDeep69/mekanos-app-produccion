import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Resultado de sincronización de una orden individual
 */
export class SyncOrdenResultDto {
  @ApiProperty({ description: 'ID de la orden procesada' })
  idOrdenServicio: number;

  @ApiProperty({ description: 'Si la sincronización fue exitosa' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Mensaje de error si falló' })
  error?: string;

  @ApiPropertyOptional({ description: 'Nueva versión del servidor' })
  serverVersion?: number;

  @ApiPropertyOptional({ description: 'Si hubo conflicto de versión' })
  conflict?: boolean;

  @ApiPropertyOptional({ description: 'Mapeo de IDs locales a IDs del servidor' })
  idMapping?: {
    mediciones?: { localId: string; serverId: number }[];
    actividades?: { localId: string; serverId: number }[];
  };
}

/**
 * Respuesta del batch upload
 */
export class SyncBatchResponseDto {
  @ApiProperty({ description: 'Si el batch completo fue exitoso' })
  success: boolean;

  @ApiProperty({ description: 'Timestamp de procesamiento del servidor' })
  serverTimestamp: string;

  @ApiProperty({ description: 'Total de órdenes procesadas' })
  totalProcessed: number;

  @ApiProperty({ description: 'Total de órdenes exitosas' })
  totalSuccess: number;

  @ApiProperty({ description: 'Total de órdenes con error' })
  totalErrors: number;

  @ApiProperty({ description: 'Total de conflictos detectados' })
  totalConflicts: number;

  @ApiProperty({ type: [SyncOrdenResultDto], description: 'Resultado por orden' })
  results: SyncOrdenResultDto[];
}

/**
 * Orden resumida para download (datos esenciales para móvil)
 */
export class SyncOrdenDownloadDto {
  @ApiProperty()
  idOrdenServicio: number;

  @ApiProperty()
  numeroOrden: string;

  @ApiProperty()
  version: number;

  @ApiProperty()
  idEstadoActual: number;

  @ApiProperty()
  codigoEstado: string;

  @ApiProperty()
  nombreEstado: string;

  @ApiPropertyOptional()
  fechaProgramada?: string;

  @ApiProperty()
  prioridad: string;

  // Cliente
  @ApiProperty()
  idCliente: number;

  @ApiProperty()
  nombreCliente: string;

  // Sede
  @ApiPropertyOptional()
  idSede?: number;

  @ApiPropertyOptional()
  nombreSede?: string;

  @ApiPropertyOptional()
  direccionSede?: string;

  // Equipo
  @ApiProperty()
  idEquipo: number;

  @ApiProperty()
  codigoEquipo: string;

  @ApiProperty()
  nombreEquipo: string;

  @ApiPropertyOptional()
  ubicacionEquipo?: string;

  // Tipo de servicio
  @ApiProperty()
  idTipoServicio: number;

  @ApiProperty()
  codigoTipoServicio: string;

  @ApiProperty()
  nombreTipoServicio: string;

  // Descripción
  @ApiPropertyOptional()
  descripcionInicial?: string;

  @ApiPropertyOptional()
  trabajoRealizado?: string;

  @ApiPropertyOptional()
  observacionesTecnico?: string;

  // ✅ FIX: Agregar URL del PDF para sincronización
  @ApiPropertyOptional({ description: 'URL del PDF generado (órdenes completadas)' })
  urlPdf?: string;

  // ✅ FIX: Campos de horarios para órdenes completadas
  @ApiPropertyOptional({ description: 'Fecha/hora real de inicio del servicio' })
  fechaInicioReal?: string;

  @ApiPropertyOptional({ description: 'Fecha/hora real de finalización del servicio' })
  fechaFinReal?: string;

  // ✅ FIX: Horas como TEXTO PLANO (sin procesamiento de zona horaria)
  @ApiPropertyOptional({ description: 'Hora de entrada (formato HH:mm)' })
  horaEntrada?: string;

  @ApiPropertyOptional({ description: 'Hora de salida (formato HH:mm)' })
  horaSalida?: string;

  @ApiPropertyOptional({ description: 'Duración del servicio en minutos' })
  duracionMinutos?: number;

  // ✅ FIX: Estadísticas para órdenes completadas (evita cargar datos pesados)
  @ApiPropertyOptional({ description: 'Cantidad de actividades ejecutadas' })
  totalActividades?: number;

  @ApiPropertyOptional({ description: 'Cantidad de mediciones registradas' })
  totalMediciones?: number;

  @ApiPropertyOptional({ description: 'Cantidad de evidencias fotográficas' })
  totalEvidencias?: number;

  @ApiPropertyOptional({ description: 'Cantidad de firmas digitales' })
  totalFirmas?: number;

  // ✅ FIX: Desglose de actividades por estado para historial sincronizado
  @ApiPropertyOptional({ description: 'Actividades en buen estado (B)' })
  actividadesBuenas?: number;

  @ApiPropertyOptional({ description: 'Actividades en mal estado (M)' })
  actividadesMalas?: number;

  @ApiPropertyOptional({ description: 'Actividades corregidas (C)' })
  actividadesCorregidas?: number;

  @ApiPropertyOptional({ description: 'Actividades no aplica (NA)' })
  actividadesNA?: number;

  // ✅ FIX: Desglose de mediciones por estado para historial sincronizado
  @ApiPropertyOptional({ description: 'Mediciones en estado normal (dentro de rango)' })
  medicionesNormales?: number;

  @ApiPropertyOptional({ description: 'Mediciones en advertencia (cerca de límites)' })
  medicionesAdvertencia?: number;

  @ApiPropertyOptional({ description: 'Mediciones críticas (fuera de rango)' })
  medicionesCriticas?: number;

  // Fechas
  @ApiProperty()
  fechaCreacion: string;

  @ApiPropertyOptional()
  fechaModificacion?: string;
}

/**
 * Parámetro de medición para download
 */
export class SyncParametroMedicionDto {
  @ApiProperty()
  idParametroMedicion: number;

  @ApiProperty()
  codigoParametro: string;

  @ApiProperty()
  nombreParametro: string;

  @ApiProperty()
  unidadMedida: string;

  @ApiProperty()
  tipoDato: string;

  @ApiPropertyOptional()
  valorMinimoNormal?: number;

  @ApiPropertyOptional()
  valorMaximoNormal?: number;

  @ApiPropertyOptional()
  valorMinimoCritico?: number;

  @ApiPropertyOptional()
  valorMaximoCritico?: number;

  @ApiPropertyOptional()
  valorIdeal?: number;

  @ApiProperty()
  esCriticoSeguridad: boolean;

  @ApiProperty()
  esObligatorio: boolean;

  @ApiProperty()
  decimalesPrecision: number;
}

/**
 * Actividad del catálogo para download
 */
export class SyncActividadCatalogoDto {
  @ApiProperty()
  idActividadCatalogo: number;

  @ApiProperty()
  codigoActividad: string;

  @ApiProperty()
  descripcionActividad: string;

  @ApiProperty()
  tipoActividad: string;

  @ApiProperty()
  ordenEjecucion: number;

  @ApiProperty()
  esObligatoria: boolean;

  @ApiPropertyOptional()
  tiempoEstimadoMinutos?: number;

  @ApiPropertyOptional()
  instrucciones?: string;

  @ApiPropertyOptional()
  precauciones?: string;

  @ApiPropertyOptional()
  idParametroMedicion?: number;

  @ApiPropertyOptional({ description: 'ID del tipo de servicio al que pertenece esta actividad' })
  idTipoServicio?: number;

  @ApiPropertyOptional({ description: 'Sistema al que pertenece (ENFRIAMIENTO, LUBRICACION, etc.)' })
  sistema?: string;
}

/**
 * Tipo de servicio para download
 */
export class SyncTipoServicioDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional()
  descripcion?: string;
}

/**
 * Respuesta de download de datos para técnico
 */
export class SyncDownloadResponseDto {
  @ApiProperty({ description: 'Timestamp del servidor para referencia' })
  serverTimestamp: string;

  @ApiProperty({ description: 'ID del técnico' })
  tecnicoId: number;

  @ApiProperty({ type: [SyncOrdenDownloadDto], description: 'Órdenes asignadas' })
  ordenes: SyncOrdenDownloadDto[];

  @ApiProperty({ type: [SyncParametroMedicionDto], description: 'Parámetros de medición activos' })
  parametrosMedicion: SyncParametroMedicionDto[];

  @ApiProperty({ type: [SyncActividadCatalogoDto], description: 'Catálogo de actividades' })
  actividadesCatalogo: SyncActividadCatalogoDto[];

  @ApiProperty({ description: 'Estados de orden disponibles' })
  estadosOrden: { id: number; codigo: string; nombre: string; esEstadoFinal: boolean }[];

  @ApiProperty({ type: [SyncTipoServicioDto], description: 'Tipos de servicio disponibles' })
  tiposServicio: SyncTipoServicioDto[];
}
