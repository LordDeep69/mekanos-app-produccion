import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * UPDATE COTIZACION DTO (EAM-CPQ Universal)
 */
export class UpdateCotizacionDto {
  @ApiPropertyOptional({ description: 'ID de la sede del cliente' })
  @IsOptional()
  @IsNumber()
  id_sede?: number | null;

  @ApiPropertyOptional({ description: 'ID del equipo principal (compatibilidad)' })
  @IsOptional()
  @IsNumber()
  id_equipo?: number | null;

  @ApiPropertyOptional({ description: 'Lista N:M de equipos vinculados', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  equipos_ids?: number[];

  @ApiPropertyOptional({ description: 'Tipo de cotización' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tipo_cotizacion?: string;

  @ApiPropertyOptional({ description: 'Código ISO de moneda' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  moneda?: string;

  @ApiPropertyOptional({ description: 'Fecha de cotización' })
  @IsOptional()
  @IsDateString()
  fecha_cotizacion?: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento' })
  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string;

  @ApiPropertyOptional({ description: 'Asunto/título de la cotización' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  asunto?: string;

  @ApiPropertyOptional({ description: 'Descripción general de la cotización' })
  @IsOptional()
  @IsString()
  descripcion_general?: string;

  @ApiPropertyOptional({ description: 'Alcance del trabajo' })
  @IsOptional()
  @IsString()
  alcance_trabajo?: string;

  @ApiPropertyOptional({ description: 'Exclusiones del servicio' })
  @IsOptional()
  @IsString()
  exclusiones?: string;

  @ApiPropertyOptional({ description: 'Porcentaje de descuento (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Porcentaje de IVA (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  iva_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Activar estructura opcional AIU' })
  @IsOptional()
  @IsBoolean()
  usa_aiu?: boolean;

  @ApiPropertyOptional({ description: 'Porcentaje Administración AIU (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_admin_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Porcentaje Imprevistos AIU (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_imprevistos_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Porcentaje Utilidad AIU (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_utilidad_porcentaje?: number;

  @ApiPropertyOptional({ description: 'IVA sobre Utilidad AIU únicamente' })
  @IsOptional()
  @IsBoolean()
  iva_sobre_utilidad_aiu?: boolean;

  @ApiPropertyOptional({ description: 'Modo de agrupación visual en PDF (POR_CATEGORIA | POR_EQUIPO)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  modo_agrupacion_pdf?: string;

  @ApiPropertyOptional({ description: 'Tiempo estimado de ejecución en días' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tiempo_estimado_dias?: number;

  @ApiPropertyOptional({ description: 'Forma de pago' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  forma_pago?: string;

  @ApiPropertyOptional({ description: 'Términos y condiciones' })
  @IsOptional()
  @IsString()
  terminos_condiciones?: string;

  @ApiPropertyOptional({ description: 'Garantía en meses' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  meses_garantia?: number;

  @ApiPropertyOptional({ description: 'Observaciones de garantía' })
  @IsOptional()
  @IsString()
  observaciones_garantia?: string;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'ID del usuario que modifica (resuelto del JWT)' })
  @IsOptional()
  @IsNumber()
  modificado_por?: number;
}
