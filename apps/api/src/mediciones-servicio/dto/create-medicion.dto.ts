import {
  IsInt,
  IsNumber,
  IsString,
  IsOptional,
  MaxLength,
  IsISO8601,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO para crear medición de servicio
 * FASE 4.2 - Validación con rangos automáticos
 */

export class CreateMedicionDto {
  @IsInt()
  id_orden_servicio!: number;

  @IsInt()
  id_parametro_medicion!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  valor_numerico?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  valor_texto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidad_medida?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-50)
  @Max(100)
  temperatura_ambiente?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  humedad_relativa?: number;

  @IsOptional()
  @IsISO8601()
  fecha_medicion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  instrumento_medicion?: string;

  // ⚠️ Campos calculados automáticamente por el handler (NO enviar en request):
  // - fuera_de_rango
  // - nivel_alerta
  // - mensaje_alerta
  // - medido_por (extraído de JWT)
}
