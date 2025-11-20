import { IsOptional, IsNumber, IsString, IsDateString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UPDATE COTIZACION DTO
 * 
 * Validaciones para actualizar una cotización existente.
 * Solo permite modificar campos editables (no fechas de sistema ni totales).
 */
export class UpdateCotizacionDto {
  @ApiPropertyOptional({
    description: 'ID de la sede del cliente',
    example: 13,
  })
  @IsOptional()
  @IsNumber({}, { message: 'id_sede debe ser un número' })
  id_sede?: number;

  @ApiPropertyOptional({
    description: 'ID del equipo',
    example: 46,
  })
  @IsOptional()
  @IsNumber({}, { message: 'id_equipo debe ser un número' })
  id_equipo?: number;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento',
    example: '2025-12-20',
  })
  @IsOptional()
  @IsDateString({}, { message: 'fecha_vencimiento debe ser una fecha válida (ISO 8601)' })
  fecha_vencimiento?: string;

  @ApiPropertyOptional({
    description: 'Asunto/título de la cotización',
    example: 'Mantenimiento preventivo planta eléctrica',
  })
  @IsOptional()
  @IsString({ message: 'asunto debe ser texto' })
  asunto?: string;

  @ApiPropertyOptional({
    description: 'Descripción general de la cotización',
    example: 'Mantenimiento preventivo completo',
  })
  @IsOptional()
  @IsString({ message: 'descripcion_general debe ser texto' })
  descripcion_general?: string;

  @ApiPropertyOptional({
    description: 'Alcance del trabajo',
    example: 'Revisión sistema eléctrico, cambio filtros',
  })
  @IsOptional()
  @IsString({ message: 'alcance_trabajo debe ser texto' })
  alcance_trabajo?: string;

  @ApiPropertyOptional({
    description: 'Exclusiones del servicio',
    example: 'No incluye repuestos adicionales',
  })
  @IsOptional()
  @IsString({ message: 'exclusiones debe ser texto' })
  exclusiones?: string;

  @ApiPropertyOptional({
    description: 'Porcentaje de descuento (0-100)',
    example: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'descuento_porcentaje debe ser un número' })
  @Min(0, { message: 'descuento_porcentaje no puede ser negativo' })
  @Max(100, { message: 'descuento_porcentaje no puede superar 100' })
  descuento_porcentaje?: number;

  @ApiPropertyOptional({
    description: 'Porcentaje de IVA (0-100)',
    example: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'iva_porcentaje debe ser un número' })
  @Min(0, { message: 'iva_porcentaje no puede ser negativo' })
  @Max(100, { message: 'iva_porcentaje no puede superar 100' })
  iva_porcentaje?: number;

  @ApiPropertyOptional({
    description: 'Tiempo estimado de ejecución en días',
    example: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'tiempo_estimado_dias debe ser un número' })
  @Min(0, { message: 'tiempo_estimado_dias no puede ser negativo' })
  tiempo_estimado_dias?: number;

  @ApiPropertyOptional({
    description: 'Forma de pago',
    example: 'CONTADO',
  })
  @IsOptional()
  @IsString({ message: 'forma_pago debe ser texto' })
  forma_pago?: string;

  @ApiPropertyOptional({
    description: 'Términos y condiciones',
    example: 'Pago 50% anticipo, 50% contra entrega',
  })
  @IsOptional()
  @IsString({ message: 'terminos_condiciones debe ser texto' })
  terminos_condiciones?: string;

  @ApiPropertyOptional({
    description: 'Garantía en meses',
    example: 18,
  })
  @IsOptional()
  @IsNumber({}, { message: 'meses_garantia debe ser un número' })
  @Min(0, { message: 'meses_garantia no puede ser negativo' })
  meses_garantia?: number;

  @ApiPropertyOptional({
    description: 'Observaciones de garantía',
    example: 'Garantía solo cubre defectos de fabricación',
  })
  @IsOptional()
  @IsString({ message: 'observaciones_garantia debe ser texto' })
  observaciones_garantia?: string;

  @ApiPropertyOptional({
    description: 'Observaciones',
    example: 'Actualizado: incluye componentes adicionales',
  })
  @IsOptional()
  @IsString({ message: 'observaciones debe ser texto' })
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'ID del usuario que modifica',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'modificado_por debe ser un número' })
  modificado_por?: number;
}
