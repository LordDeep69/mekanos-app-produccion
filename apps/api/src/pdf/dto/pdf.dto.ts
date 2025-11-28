/**
 * ============================================================================
 * PDF DTOs - MEKANOS S.A.S
 * ============================================================================
 * 
 * DTOs con validación completa para endpoints de generación de PDF.
 * Usan class-validator para validación automática en el pipeline de NestJS.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

/**
 * Tipos de informe disponibles
 */
export enum TipoInformePdf {
  GENERADOR_A = 'GENERADOR_A',
  GENERADOR_B = 'GENERADOR_B',
  BOMBA_A = 'BOMBA_A',
  COTIZACION = 'COTIZACION',
}

/**
 * DTO para generar PDF de orden por ID
 */
export class GenerarPdfOrdenParamsDto {
  @ApiProperty({
    description: 'ID de la orden de servicio (UUID o numérico)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'El ID de la orden es requerido' })
  @IsString()
  id: string;
}

/**
 * DTO para query params de generación de PDF
 */
export class GenerarPdfOrdenQueryDto {
  @ApiPropertyOptional({
    description: 'Tipo de informe a generar',
    enum: TipoInformePdf,
    default: TipoInformePdf.GENERADOR_A,
  })
  @IsOptional()
  @IsEnum(TipoInformePdf, { 
    message: 'Tipo de informe inválido. Use: GENERADOR_A, GENERADOR_B, BOMBA_A, COTIZACION' 
  })
  tipo?: TipoInformePdf = TipoInformePdf.GENERADOR_A;

  @ApiPropertyOptional({
    description: 'Si guardar automáticamente en la nube',
    default: false,
  })
  @IsOptional()
  guardarEnNube?: boolean;
}

/**
 * DTO para respuesta de generación de PDF
 */
export class GenerarPdfResponseDto {
  @ApiProperty({ description: 'Si la generación fue exitosa' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Nombre del archivo generado' })
  filename?: string;

  @ApiPropertyOptional({ description: 'Tamaño en bytes' })
  size?: number;

  @ApiPropertyOptional({ description: 'URL pública si se guardó en la nube' })
  url?: string;

  @ApiPropertyOptional({ description: 'Mensaje de error si falló' })
  error?: string;
}

/**
 * DTO para generar PDF de cotización
 */
export class GenerarPdfCotizacionParamsDto {
  @ApiProperty({
    description: 'ID de la cotización',
    example: 1,
  })
  @IsNotEmpty({ message: 'El ID de la cotización es requerido' })
  @IsInt({ message: 'El ID debe ser un número entero' })
  @IsPositive({ message: 'El ID debe ser positivo' })
  id: number;
}

/**
 * DTO para generar PDF desde datos manuales (sin orden en BD)
 */
export class GenerarPdfManualDto {
  @ApiProperty({
    description: 'Tipo de informe a generar',
    enum: TipoInformePdf,
  })
  @IsEnum(TipoInformePdf)
  tipoInforme: TipoInformePdf;

  @ApiProperty({ description: 'Número de orden' })
  @IsString()
  @IsNotEmpty()
  numeroOrden: string;

  @ApiPropertyOptional({ description: 'Estado de la orden' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ description: 'Prioridad' })
  @IsOptional()
  @IsString()
  prioridad?: string;

  @ApiPropertyOptional({ description: 'Nombre del cliente' })
  @IsOptional()
  @IsString()
  clienteNombre?: string;

  @ApiPropertyOptional({ description: 'NIT del cliente' })
  @IsOptional()
  @IsString()
  clienteNit?: string;

  @ApiPropertyOptional({ description: 'Dirección del cliente' })
  @IsOptional()
  @IsString()
  clienteDireccion?: string;

  @ApiPropertyOptional({ description: 'Código del equipo' })
  @IsOptional()
  @IsString()
  equipoCodigo?: string;

  @ApiPropertyOptional({ description: 'Nombre del equipo' })
  @IsOptional()
  @IsString()
  equipoNombre?: string;

  @ApiPropertyOptional({ description: 'Marca del equipo' })
  @IsOptional()
  @IsString()
  equipoMarca?: string;

  @ApiPropertyOptional({ description: 'Modelo del equipo' })
  @IsOptional()
  @IsString()
  equipoModelo?: string;

  @ApiPropertyOptional({ description: 'Serie del equipo' })
  @IsOptional()
  @IsString()
  equipoSerie?: string;

  @ApiPropertyOptional({ description: 'Tipo de equipo' })
  @IsOptional()
  @IsString()
  tipoEquipo?: string;

  @ApiPropertyOptional({ description: 'Nombre del técnico' })
  @IsOptional()
  @IsString()
  tecnicoNombre?: string;

  @ApiPropertyOptional({ description: 'Trabajo realizado' })
  @IsOptional()
  @IsString()
  trabajoRealizado?: string;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
