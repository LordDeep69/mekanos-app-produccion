import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min
} from 'class-validator';

/**
 * DTO para crear medición de servicio - REFACTORIZADO
 * Tabla 10/14 - FASE 3 - camelCase
 */

export class CreateMedicionDto {
  @ApiProperty({ description: 'ID de la orden de servicio', example: 1 })
  @IsInt()
  idOrdenServicio!: number;

  @ApiProperty({ description: 'ID del parámetro de medición del catálogo', example: 1 })
  @IsInt()
  idParametroMedicion!: number;

  @ApiPropertyOptional({ description: 'Valor numérico de la medición (Decimal 12,2)', example: 220.5, type: 'number' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  valorNumerico?: number;

  @ApiPropertyOptional({ description: 'Valor de texto para mediciones no numéricas', example: 'BUENO', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  valorTexto?: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Temperatura ambiente en °C (Decimal 5,2, rango: -20 a 60)', example: 25.5, type: 'number' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-20)
  @Max(60)
  temperaturaAmbiente?: number;

  @ApiPropertyOptional({ description: 'Humedad relativa en % (Decimal 5,2, rango: 0 a 100)', example: 65.2, type: 'number' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  humedadRelativa?: number;

  @ApiPropertyOptional({ description: 'Fecha y hora de la medición (ISO 8601)', example: '2025-11-24T15:30:00Z' })
  @IsOptional()
  @IsDateString()
  fechaMedicion?: string;

  @ApiPropertyOptional({ description: 'Instrumento usado para medir', example: 'Multímetro Fluke 87V', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instrumentoMedicion?: string;

  // ⚠️ Campos calculados automáticamente por el handler/trigger (NO enviar en request):
  // - unidadMedida (trigger BD copia desde parametros_medicion)
  // - fueraDeRango (trigger BD calcula comparando con rangos críticos)
  // - nivelAlerta (backend calcula: OK, ADVERTENCIA, CRITICO)
  // - mensajeAlerta (backend genera mensaje localizado)
  // - medidoPor (extraído del JWT del usuario autenticado)
  // - fechaRegistro (timestamp automático)
}
