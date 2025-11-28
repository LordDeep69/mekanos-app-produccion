import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HistorialEstadosOrdenResponseDto {
  @ApiProperty({
    description: 'ID único del historial de estado',
    example: 1,
    type: 'integer',
  })
  idHistorial: number;

  @ApiProperty({
    description: 'ID de la orden de servicio',
    example: 1,
    type: 'integer',
  })
  idOrdenServicio: number;

  @ApiPropertyOptional({
    description: 'ID del estado anterior',
    example: 1,
    type: 'integer',
    nullable: true,
  })
  idEstadoAnterior?: number | null;

  @ApiProperty({
    description: 'ID del estado nuevo',
    example: 2,
    type: 'integer',
  })
  idEstadoNuevo: number;

  @ApiPropertyOptional({
    description: 'Motivo del cambio',
    example: 'Cliente solicitó cambio de prioridad',
    nullable: true,
  })
  motivoCambio?: string | null;

  @ApiPropertyOptional({
    description: 'Observaciones adicionales',
    example: 'Se notificó al cliente',
    nullable: true,
  })
  observaciones?: string | null;

  @ApiPropertyOptional({
    description: 'Acción realizada',
    example: 'CAMBIO_ESTADO_MANUAL',
    nullable: true,
  })
  accion?: string | null;

  @ApiProperty({
    description: 'Fecha y hora del cambio',
    example: '2025-11-24T19:17:06.087Z',
    type: 'string',
    format: 'date-time',
  })
  fechaCambio: Date;

  @ApiProperty({
    description: 'ID del usuario que realizó el cambio',
    example: 1,
    type: 'integer',
  })
  realizadoPor: number;

  @ApiPropertyOptional({
    description: 'IP desde donde se realizó el cambio',
    example: '192.168.1.100',
    nullable: true,
  })
  ipOrigen?: string | null;

  @ApiPropertyOptional({
    description: 'User agent del navegador',
    example: 'Mozilla/5.0',
    nullable: true,
  })
  userAgent?: string | null;

  @ApiPropertyOptional({
    description: 'Duración del estado anterior en minutos',
    example: 120,
    type: 'integer',
    nullable: true,
  })
  duracionEstadoAnteriorMinutos?: number | null;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales',
    example: { sistema: 'auto' },
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  metadata?: any | null;

  // Relaciones
  @ApiPropertyOptional({
    description: 'Datos de la orden de servicio',
    type: 'object',
    properties: {
      idOrdenServicio: { type: 'integer', example: 1 },
      numeroOrden: { type: 'string', example: 'OS-2025-001' },
      idCliente: { type: 'integer', example: 1 },
      idEquipo: { type: 'integer', example: 1 },
    },
  })
  orden?: {
    idOrdenServicio: number;
    numeroOrden: string;
    idCliente: number;
    idEquipo: number;
  };

  @ApiPropertyOptional({
    description: 'Datos del estado anterior',
    type: 'object',
    nullable: true,
    properties: {
      idEstado: { type: 'integer', example: 1 },
      codigoEstado: { type: 'string', example: 'PENDIENTE' },
      nombreEstado: { type: 'string', example: 'Pendiente' },
      colorHex: { type: 'string', example: '#FFA500' },
    },
  })
  estadoAnterior?: {
    idEstado: number;
    codigoEstado: string;
    nombreEstado: string;
    colorHex: string | null;
  } | null;

  @ApiPropertyOptional({
    description: 'Datos del estado nuevo',
    type: 'object',
    properties: {
      idEstado: { type: 'integer', example: 2 },
      codigoEstado: { type: 'string', example: 'EN_PROCESO' },
      nombreEstado: { type: 'string', example: 'En Proceso' },
      colorHex: { type: 'string', example: '#007BFF' },
    },
  })
  estadoNuevo?: {
    idEstado: number;
    codigoEstado: string;
    nombreEstado: string;
    colorHex: string | null;
  };

  @ApiPropertyOptional({
    description: 'Datos del usuario que realizó el cambio',
    type: 'object',
    properties: {
      idUsuario: { type: 'integer', example: 1 },
      email: { type: 'string', example: 'admin@mekanos.com' },
    },
  })
  usuarioRealizador?: {
    idUsuario: number;
    email: string;
  };
}
