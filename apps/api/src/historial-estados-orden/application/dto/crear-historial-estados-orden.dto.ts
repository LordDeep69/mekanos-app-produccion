import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CrearHistorialEstadosOrdenDto {
  @ApiProperty({
    description: 'ID de la orden de servicio (FK a ordenes_servicio)',
    example: 1,
    type: 'integer',
  })
  @IsInt({ message: 'idOrdenServicio debe ser un número entero' })
  @Type(() => Number)
  idOrdenServicio: number;

  @ApiPropertyOptional({
    description: 'ID del estado anterior (FK a estados_orden, nullable)',
    example: 1,
    type: 'integer',
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'idEstadoAnterior debe ser un número entero' })
  @Type(() => Number)
  idEstadoAnterior?: number;

  @ApiProperty({
    description: 'ID del estado nuevo (FK a estados_orden)',
    example: 2,
    type: 'integer',
  })
  @IsInt({ message: 'idEstadoNuevo debe ser un número entero' })
  @Type(() => Number)
  idEstadoNuevo: number;

  @ApiPropertyOptional({
    description: 'Motivo del cambio de estado',
    example: 'Cliente solicitó cambio de prioridad',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'motivoCambio debe ser una cadena de texto' })
  @MaxLength(500, { message: 'motivoCambio no puede exceder 500 caracteres' })
  motivoCambio?: string;

  @ApiPropertyOptional({
    description: 'Observaciones adicionales',
    example: 'Se notificó al cliente por correo electrónico',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'observaciones debe ser una cadena de texto' })
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'Acción realizada',
    example: 'CAMBIO_ESTADO_MANUAL',
    maxLength: 100,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'accion debe ser una cadena de texto' })
  @MaxLength(100, { message: 'accion no puede exceder 100 caracteres' })
  accion?: string;

  @ApiProperty({
    description: 'ID del usuario que realizó el cambio (FK a usuarios)',
    example: 1,
    type: 'integer',
  })
  @IsInt({ message: 'realizadoPor debe ser un número entero' })
  @Type(() => Number)
  realizadoPor: number;

  @ApiPropertyOptional({
    description: 'Dirección IP desde donde se realizó el cambio',
    example: '192.168.1.100',
    maxLength: 45,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'ipOrigen debe ser una cadena de texto' })
  @MaxLength(45, { message: 'ipOrigen no puede exceder 45 caracteres (IPv6)' })
  ipOrigen?: string;

  @ApiPropertyOptional({
    description: 'User agent del navegador/aplicación',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'userAgent debe ser una cadena de texto' })
  @MaxLength(500, { message: 'userAgent no puede exceder 500 caracteres' })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Duración del estado anterior en minutos (debe ser >= 0)',
    example: 120,
    type: 'integer',
    minimum: 0,
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'duracionEstadoAnteriorMinutos debe ser un número entero' })
  @Min(0, { message: 'duracionEstadoAnteriorMinutos debe ser mayor o igual a 0' })
  @Type(() => Number)
  duracionEstadoAnteriorMinutos?: number;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales en formato JSON',
    example: { sistema: 'auto', version: '1.0' },
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  @IsOptional()
  metadata?: any;
}
