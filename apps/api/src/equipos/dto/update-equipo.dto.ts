import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from 'class-validator';

/**
 * DTO para actualizar un equipo
 * ✅ FASE 2: Todos los campos opcionales, mapeados a schema real
 * ✅ 07-ENE-2026: Agregado config_parametros para edición de unidades/rangos
 * ✅ 23-FEB-2026: Expandido con TODOS los campos de la tabla equipos (CRUD completo)
 */
export class UpdateEquipoDto {
  // ═══════════════════════════════════════════════════════
  // IDENTIFICACIÓN
  // ═══════════════════════════════════════════════════════

  @IsOptional()
  @IsString({ message: 'codigo_equipo debe ser una cadena de texto' })
  @MinLength(1, { message: 'codigo_equipo no puede estar vacío' })
  @MaxLength(30, { message: 'codigo_equipo no puede exceder 30 caracteres' })
  @Matches(/^[A-Z0-9\-]+$/, {
    message: 'codigo_equipo debe contener solo letras mayúsculas, números y guiones'
  })
  codigo_equipo?: string;

  @IsOptional()
  @IsInt({ message: 'id_cliente debe ser un número entero' })
  id_cliente?: number;

  @IsOptional()
  @IsInt({ message: 'id_tipo_equipo debe ser un número entero' })
  id_tipo_equipo?: number;

  @IsOptional()
  @IsInt({ message: 'id_sede debe ser un número entero' })
  id_sede?: number | null;

  @IsOptional()
  @IsString({ message: 'nombre_equipo debe ser una cadena de texto' })
  @MaxLength(200, { message: 'nombre_equipo no puede exceder 200 caracteres' })
  nombre_equipo?: string;

  @IsOptional()
  @IsString({ message: 'numero_serie_equipo debe ser una cadena de texto' })
  @MaxLength(100, { message: 'numero_serie_equipo no puede exceder 100 caracteres' })
  numero_serie_equipo?: string;

  // ═══════════════════════════════════════════════════════
  // UBICACIÓN
  // ═══════════════════════════════════════════════════════

  @IsOptional()
  @IsString({ message: 'ubicacion_texto debe ser una cadena de texto' })
  @MinLength(5, { message: 'ubicacion_texto debe tener al menos 5 caracteres' })
  @MaxLength(500, { message: 'ubicacion_texto no puede exceder 500 caracteres' })
  ubicacion_texto?: string;

  // ═══════════════════════════════════════════════════════
  // ESTADO OPERATIVO
  // ═══════════════════════════════════════════════════════

  @IsOptional()
  @IsEnum(['OPERATIVO', 'STANDBY', 'INACTIVO', 'EN_REPARACION', 'FUERA_SERVICIO', 'BAJA'], {
    message: 'estado_equipo debe ser un valor válido del enum'
  })
  estado_equipo?: string;

  @IsOptional()
  @IsEnum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA'], {
    message: 'criticidad debe ser un valor válido del enum'
  })
  criticidad?: string;

  @IsOptional()
  @IsString()
  criticidad_justificacion?: string;

  // ═══════════════════════════════════════════════════════
  // FECHAS
  // ═══════════════════════════════════════════════════════

  @IsOptional()
  @IsDateString()
  fecha_instalacion?: string | null;

  @IsOptional()
  @IsDateString()
  fecha_inicio_servicio_mekanos?: string | null;

  // ═══════════════════════════════════════════════════════
  // GARANTÍA
  // ═══════════════════════════════════════════════════════

  @IsOptional()
  @IsBoolean()
  en_garantia?: boolean;

  @IsOptional()
  @IsDateString()
  fecha_inicio_garantia?: string | null;

  @IsOptional()
  @IsDateString()
  fecha_fin_garantia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  proveedor_garantia?: string;

  // ═══════════════════════════════════════════════════════
  // ESTADO PINTURA
  // ═══════════════════════════════════════════════════════

  @IsOptional()
  @IsEnum(['EXCELENTE', 'BUENO', 'REGULAR', 'MALO', 'NO_APLICA'], {
    message: 'estado_pintura debe ser un valor válido'
  })
  estado_pintura?: string;

  @IsOptional()
  @IsBoolean()
  requiere_pintura?: boolean;

  // ═══════════════════════════════════════════════════════
  // CONTRATO
  // ═══════════════════════════════════════════════════════

  @IsOptional()
  @IsEnum(['SIN_CONTRATO', 'PREVENTIVO', 'INTEGRAL', 'POR_LLAMADA'], {
    message: 'tipo_contrato debe ser un valor válido'
  })
  tipo_contrato?: string;

  // ═══════════════════════════════════════════════════════
  // INTERVALOS MANTENIMIENTO OVERRIDE
  // ═══════════════════════════════════════════════════════

  @IsOptional()
  @IsInt()
  intervalo_tipo_a_dias_override?: number | null;

  @IsOptional()
  @IsNumber()
  intervalo_tipo_a_horas_override?: number | null;

  @IsOptional()
  @IsInt()
  intervalo_tipo_b_dias_override?: number | null;

  @IsOptional()
  @IsNumber()
  intervalo_tipo_b_horas_override?: number | null;

  @IsOptional()
  @IsEnum(['DIAS', 'HORAS', 'LO_QUE_OCURRA_PRIMERO'], {
    message: 'criterio_intervalo_override debe ser un valor válido'
  })
  criterio_intervalo_override?: string | null;

  // ═══════════════════════════════════════════════════════
  // OBSERVACIONES
  // ═══════════════════════════════════════════════════════

  @IsOptional()
  @IsString()
  observaciones_generales?: string;

  @IsOptional()
  @IsString()
  configuracion_especial?: string;

  // ═══════════════════════════════════════════════════════
  // PARÁMETROS PERSONALIZADOS
  // ═══════════════════════════════════════════════════════

  @IsOptional()
  config_parametros?: Record<string, any>;

  // modificado_por se obtiene del JWT, no del body
}
