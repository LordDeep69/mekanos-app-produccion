import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en cotizaciones.
 */
export class CreateCotizacionesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_cotizacion?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_cliente!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_sede?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_equipo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_cotizacion?: string;

  @ApiProperty()
  @IsDateString()
  fecha_vencimiento!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dias_validez?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_estado!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_cambio_estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_motivo_rechazo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones_rechazo?: string;

  @ApiProperty()
  @IsString()
  asunto!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion_general?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alcance_trabajo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exclusiones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  subtotal_servicios?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  subtotal_componentes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  subtotal_general?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  descuento_porcentaje?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  descuento_valor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  subtotal_con_descuento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  iva_porcentaje?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  iva_valor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  total_cotizacion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  forma_pago?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terminos_condiciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  meses_garantia?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones_garantia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tiempo_estimado_dias?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  version?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_cotizacion_padre?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_orden_servicio_generada?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_conversion_os?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  metadata?: Record<string, unknown> | unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  elaborada_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_creacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  aprobada_internamente_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_aprobacion_interna?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modificado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_modificacion?: string;
}
