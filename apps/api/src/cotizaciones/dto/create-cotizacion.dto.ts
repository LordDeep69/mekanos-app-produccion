import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CREATE COTIZACION DTO
 * 
 * Validaciones para crear una nueva cotización.
 */
export class CreateCotizacionDto {
  @ApiProperty({
    description: 'ID del cliente',
    example: 5,
  })
  @IsNotEmpty({ message: 'id_cliente es requerido' })
  @IsNumber({}, { message: 'id_cliente debe ser un número' })
  id_cliente!: number;

  @ApiPropertyOptional({
    description: 'ID de la sede del cliente (opcional)',
    example: 12,
  })
  @IsOptional()
  @IsNumber({}, { message: 'id_sede debe ser un número' })
  id_sede?: number;

  @ApiPropertyOptional({
    description: 'ID del equipo al que aplica la cotización (opcional)',
    example: 45,
  })
  @IsOptional()
  @IsNumber({}, { message: 'id_equipo debe ser un número' })
  id_equipo?: number;

  @ApiProperty({
    description: 'Fecha de cotización',
    example: '2025-11-14',
  })
  @IsNotEmpty({ message: 'fecha_cotizacion es requerida' })
  @IsDateString({}, { message: 'fecha_cotizacion debe ser una fecha válida (ISO 8601)' })
  fecha_cotizacion!: string;

  @ApiProperty({
    description: 'Fecha de vencimiento de la cotización',
    example: '2025-12-14',
  })
  @IsNotEmpty({ message: 'fecha_vencimiento es requerida' })
  @IsDateString({}, { message: 'fecha_vencimiento debe ser una fecha válida (ISO 8601)' })
  fecha_vencimiento!: string;

  @ApiProperty({
    description: 'Asunto/título de la cotización',
    example: 'Mantenimiento preventivo tipo A - Planta emergencia',
  })
  @IsNotEmpty({ message: 'asunto es requerido' })
  @IsString({ message: 'asunto debe ser texto' })
  asunto!: string;

  @ApiPropertyOptional({
    description: 'Descripción general del servicio',
    example: 'Mantenimiento completo sistemas eléctricos',
  })
  @IsOptional()
  @IsString({ message: 'descripcion_general debe ser texto' })
  descripcion_general?: string;

  @ApiPropertyOptional({
    description: 'Alcance del trabajo',
    example: 'Revisión completa planta eléctrica 500kVA',
  })
  @IsOptional()
  @IsString({ message: 'alcance_trabajo debe ser texto' })
  alcance_trabajo?: string;

  @ApiPropertyOptional({
    description: 'Exclusiones del servicio',
    example: 'No incluye cambio de baterías',
  })
  @IsOptional()
  @IsString({ message: 'exclusiones debe ser texto' })
  exclusiones?: string;

  @ApiPropertyOptional({
    description: 'Porcentaje de descuento (0-100)',
    example: 10,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'descuento_porcentaje debe ser un número' })
  @Min(0, { message: 'descuento_porcentaje no puede ser negativo' })
  @Max(100, { message: 'descuento_porcentaje no puede ser mayor a 100' })
  descuento_porcentaje?: number;

  @ApiPropertyOptional({
    description: 'Porcentaje de IVA (0-100)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'iva_porcentaje debe ser un número' })
  @Min(0, { message: 'iva_porcentaje no puede ser negativo' })
  @Max(100, { message: 'iva_porcentaje no puede ser mayor a 100' })
  iva_porcentaje?: number;

  @ApiPropertyOptional({
    description: 'Tiempo estimado en días',
    example: 5,
  })
  @IsOptional()
  @IsNumber({}, { message: 'tiempo_estimado_dias debe ser un número' })
  @Min(0, { message: 'tiempo_estimado_dias no puede ser negativo' })
  tiempo_estimado_dias?: number;

  @ApiPropertyOptional({
    description: 'Forma de pago (CONTADO/CREDITO)',
    example: 'CONTADO',
  })
  @IsOptional()
  @IsString({ message: 'forma_pago debe ser texto' })
  forma_pago?: string;

  @ApiPropertyOptional({
    description: 'Términos y condiciones',
    example: 'Aplican condiciones generales de contratación',
  })
  @IsOptional()
  @IsString({ message: 'terminos_condiciones debe ser texto' })
  terminos_condiciones?: string;

  @ApiPropertyOptional({
    description: 'Garantía en meses',
    example: 12,
  })
  @IsOptional()
  @IsNumber({}, { message: 'meses_garantia debe ser un número' })
  @Min(0, { message: 'meses_garantia no puede ser negativo' })
  meses_garantia?: number;

  @ApiPropertyOptional({
    description: 'Observaciones de garantía',
    example: 'Garantía válida con mantenimientos periódicos',
  })
  @IsOptional()
  @IsString({ message: 'observaciones_garantia debe ser texto' })
  observaciones_garantia?: string;

  @ApiProperty({
    description: 'ID del empleado que elabora la cotización',
    example: 1,
  })
  @IsNotEmpty({ message: 'elaborada_por es requerido' })
  @IsInt({ message: 'elaborada_por debe ser un entero' })
  elaborada_por!: number;
}
