import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoEvidenciaEnum } from '../application/enums/tipo-evidencia.enum';

/**
 * DTO para respuesta evidencia fotográfica completa
 * FASE 3 - Tabla 11 - 25 campos + 3 nested relations
 */

export class ResponseEvidenciaDto {
  // Identificación
  @ApiProperty({ description: 'ID evidencia (PK)', example: 1 })
  idEvidencia!: number;

  @ApiProperty({ description: 'ID orden servicio (FK)', example: 1 })
  idOrdenServicio!: number;

  @ApiPropertyOptional({ description: 'ID actividad ejecutada (FK)', example: 1 })
  idActividadEjecutada?: number | null;

  // Clasificación
  @ApiProperty({ enum: TipoEvidenciaEnum, description: 'Tipo evidencia' })
  tipoEvidencia!: TipoEvidenciaEnum;

  @ApiPropertyOptional({ description: 'Descripción evidencia' })
  descripcion?: string | null;

  // Archivo
  @ApiProperty({ description: 'Nombre archivo' })
  nombreArchivo!: string;

  @ApiProperty({ description: 'Ruta archivo (URL Cloudinary)' })
  rutaArchivo!: string;

  @ApiProperty({ description: 'Hash SHA256 (64 chars)' })
  hashSha256!: string;

  @ApiProperty({ description: 'Tamaño archivo bytes', example: 1024000 })
  tamañoBytes!: number;

  @ApiPropertyOptional({ description: 'MIME type' })
  mimeType?: string | null;

  @ApiPropertyOptional({ description: 'Ancho pixels', example: 1920 })
  anchoPixels?: number | null;

  @ApiPropertyOptional({ description: 'Alto pixels', example: 1080 })
  altoPixels?: number | null;

  // Visualización
  @ApiPropertyOptional({ description: 'Orden visualización', example: 1 })
  ordenVisualizacion?: number | null;

  @ApiPropertyOptional({ description: 'Es foto principal', example: false })
  esPrincipal?: boolean | null;

  // Metadata
  @ApiPropertyOptional({ description: 'Fecha captura' })
  fechaCaptura?: Date | null;

  @ApiPropertyOptional({ description: 'ID empleado capturador', example: 1 })
  capturadaPor?: number | null;

  @ApiPropertyOptional({ description: 'Latitud GPS', example: 4.6097 })
  latitud?: number | null;

  @ApiPropertyOptional({ description: 'Longitud GPS', example: -74.0817 })
  longitud?: number | null;

  @ApiPropertyOptional({ description: 'Metadata EXIF (JSON)' })
  metadataExif?: any | null;

  // Procesamiento
  @ApiPropertyOptional({ description: 'Tiene miniatura', example: false })
  tieneMiniatura?: boolean | null;

  @ApiPropertyOptional({ description: 'Ruta miniatura' })
  rutaMiniatura?: string | null;

  @ApiPropertyOptional({ description: 'Está comprimida', example: false })
  estaComprimida?: boolean | null;

  @ApiPropertyOptional({ description: 'Tamaño original bytes', example: 2048000 })
  tamañoOriginalBytes?: number | null;

  // Auditoría
  @ApiPropertyOptional({ description: 'Fecha registro' })
  fechaRegistro?: Date | null;

  // Nested relations (3)
  @ApiPropertyOptional({
    description: 'Empleado capturador',
    example: {
      idEmpleado: 1,
      codigoEmpleado: 'TEC-001',
      cargo: 'Técnico',
      esTecnico: true,
    },
  })
  empleado?: {
    idEmpleado: number;
    codigoEmpleado: string;
    cargo: string;
    esTecnico: boolean;
  } | null;

  @ApiPropertyOptional({
    description: 'Actividad ejecutada',
    example: {
      idActividadEjecutada: 1,
      idOrdenServicio: 1,
      descripcionManual: 'Cambio componente',
    },
  })
  actividadEjecutada?: {
    idActividadEjecutada: number;
    idOrdenServicio: number;
    descripcionManual?: string | null;
  } | null;

  @ApiProperty({
    description: 'Orden servicio',
    example: {
      idOrdenServicio: 1,
      numeroOrden: 'OS-2024-001',
      idCliente: 1,
      idEquipo: 1,
    },
  })
  ordenServicio!: {
    idOrdenServicio: number;
    numeroOrden: string;
    idCliente: number;
    idEquipo: number;
  };
}
