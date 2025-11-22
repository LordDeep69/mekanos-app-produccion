import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

/**
 * DTO para crear parámetros de medición
 * Validaciones class-validator para 18 campos (5 obligatorios + 13 opcionales)
 * 
 * Campo código se normaliza UPPER TRIM en handler
 * Validaciones rangos coherentes en handler (lógica compleja)
 */

// ENUMs locales para validación
enum TipoDatoParametroEnum {
  NUMERICO = 'NUMERICO',
  TEXTO = 'TEXTO',
  BOOLEANO = 'BOOLEANO',
}

enum CategoriaParametroEnum {
  MECANICO = 'MECANICO',
  ELECTRICO = 'ELECTRICO',
  HIDRAULICO = 'HIDRAULICO',
  OPERACIONAL = 'OPERACIONAL',
  AMBIENTAL = 'AMBIENTAL',
}

export class CreateParametrosMedicionDto {
  // ===== CAMPOS OBLIGATORIOS (5) =====

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  codigoParametro: string; // Normalizado UPPER TRIM en handler

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  nombreParametro: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(20)
  unidadMedida: string; // Ej: °C, PSI, RPM, V, A

  @IsEnum(CategoriaParametroEnum)
  @IsNotEmpty()
  categoria: string; // MECANICO, ELECTRICO, HIDRAULICO, OPERACIONAL, AMBIENTAL

  // ===== CAMPOS OPCIONALES (13) =====

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoDatoParametroEnum)
  tipoDato?: string; // Default: NUMERICO

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  valorMinimoNormal?: number; // Solo para tipo NUMERICO

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  valorMaximoNormal?: number; // Solo para tipo NUMERICO

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  valorMinimoCritico?: number; // Solo para tipo NUMERICO

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  valorMaximoCritico?: number; // Solo para tipo NUMERICO

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  valorIdeal?: number; // Valor óptimo operación

  @IsOptional()
  @IsInt()
  tipoEquipoId?: number; // FK opcional a tipos_equipo

  @IsOptional()
  @IsBoolean()
  esCriticoSeguridad?: boolean; // Default: false

  @IsOptional()
  @IsBoolean()
  esObligatorio?: boolean; // Default: false

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  decimalesPrecision?: number; // Default: 2, rango 0-4

  @IsOptional()
  @IsBoolean()
  activo?: boolean; // Default: true

  @IsOptional()
  @IsString()
  observaciones?: string;

  // ❌ creadoPor REMOVIDO - viene del JWT vía @CurrentUser('id')
}
