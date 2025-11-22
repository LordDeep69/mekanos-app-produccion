import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

/**
 * DTO para crear certificaciones técnicas
 * ✅ FASE 2: Certificaciones Module
 * 📋 Schema: schema.prisma lines 1811-1850
 * 🔑 FK: id_empleado (empleados)
 */

// Enum tipo_certificacion según schema.prisma
enum TipoCertificacionEnum {
  TRABAJO_ALTURAS = 'TRABAJO_ALTURAS',
  RIESGO_ELECTRICO = 'RIESGO_ELECTRICO',
  SEGURIDAD_INDUSTRIAL = 'SEGURIDAD_INDUSTRIAL',
  TECNICA_ESPECIALIZADA = 'TECNICA_ESPECIALIZADA',
  OTRA = 'OTRA',
}

export class CreateCertificacionesTecnicasDto {
  // 🔴 CAMPOS OBLIGATORIOS
  @IsInt({ message: 'id_empleado debe ser entero' })
  id_empleado!: number;

  @IsEnum(TipoCertificacionEnum, {
    message: 'tipo_certificacion debe ser válido',
  })
  tipo_certificacion!: TipoCertificacionEnum;

  @IsString({ message: 'nombre_certificacion debe ser texto' })
  @MaxLength(200, { message: 'nombre_certificacion no puede exceder 200 caracteres' })
  nombre_certificacion!: string;

  @IsString({ message: 'entidad_certificadora debe ser texto' })
  @MaxLength(200, { message: 'entidad_certificadora no puede exceder 200 caracteres' })
  entidad_certificadora!: string;

  @IsDateString({}, { message: 'fecha_expedicion debe ser fecha válida' })
  fecha_expedicion!: string;

  // 🟠 CAMPOS OPCIONALES
  @IsOptional()
  @IsString({ message: 'numero_certificacion debe ser texto' })
  @MaxLength(50, { message: 'numero_certificacion no puede exceder 50 caracteres' })
  numero_certificacion?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fecha_vencimiento debe ser fecha válida' })
  fecha_vencimiento?: string;

  @IsOptional()
  @IsString({ message: 'nivel_certificacion debe ser texto' })
  @MaxLength(50, { message: 'nivel_certificacion no puede exceder 50 caracteres' })
  nivel_certificacion?: string;

  @IsOptional()
  @IsString({ message: 'archivo_certificado debe ser texto' })
  @MaxLength(500, { message: 'archivo_certificado no puede exceder 500 caracteres' })
  archivo_certificado?: string;

  @IsOptional()
  @IsBoolean({ message: 'vigente debe ser booleano' })
  vigente?: boolean = true;

  @IsOptional()
  @IsBoolean({ message: 'es_renovacion debe ser booleano' })
  es_renovacion?: boolean = false;

  @IsOptional()
  @IsInt({ message: 'id_certificacion_anterior debe ser entero' })
  id_certificacion_anterior?: number;

  @IsOptional()
  @IsString({ message: 'observaciones debe ser texto' })
  observaciones?: string;
}
