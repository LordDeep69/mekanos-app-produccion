import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export class UpdateConfiguracionOrganizacionDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre_comercial?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  razon_social?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  tipo_id_fiscal?: string;

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  numero_id_fiscal?: string | null;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  eslogan?: string | null;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sitio_web?: string | null;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email_contacto?: string | null;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono_principal?: string | null;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono_soporte?: string | null;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion_linea1?: string | null;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad_defecto?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento_defecto?: string | null;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pais_defecto?: string;

  @ApiPropertyOptional({ maxLength: 5 })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  codigo_pais_iso?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_principal_url?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_claro_url?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  isotipo_url?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  favicon_url?: string | null;

  @ApiPropertyOptional({ example: '#1E40AF' })
  @IsOptional()
  @Matches(HEX_COLOR_REGEX, { message: 'color_primario debe ser un HEX de 6 dígitos (#RRGGBB)' })
  color_primario?: string;

  @ApiPropertyOptional({ example: '#0F172A' })
  @IsOptional()
  @Matches(HEX_COLOR_REGEX, { message: 'color_secundario debe ser un HEX de 6 dígitos (#RRGGBB)' })
  color_secundario?: string;

  @ApiPropertyOptional({ example: '#0EA5E9' })
  @IsOptional()
  @Matches(HEX_COLOR_REGEX, { message: 'color_acento debe ser un HEX de 6 dígitos (#RRGGBB)' })
  color_acento?: string;

  @ApiPropertyOptional({ example: '#16A34A' })
  @IsOptional()
  @Matches(HEX_COLOR_REGEX, { message: 'color_exito debe ser un HEX de 6 dígitos (#RRGGBB)' })
  color_exito?: string;

  @ApiPropertyOptional({ example: '#D97706' })
  @IsOptional()
  @Matches(HEX_COLOR_REGEX, { message: 'color_alerta debe ser un HEX de 6 dígitos (#RRGGBB)' })
  color_alerta?: string;

  @ApiPropertyOptional({ example: '#DC2626' })
  @IsOptional()
  @Matches(HEX_COLOR_REGEX, { message: 'color_peligro debe ser un HEX de 6 dígitos (#RRGGBB)' })
  color_peligro?: string;

  @ApiPropertyOptional({ example: 'America/Bogota', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  zona_horaria?: string;

  @ApiPropertyOptional({ example: 'es-CO', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;

  @ApiPropertyOptional({ example: 'COP', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  codigo_moneda?: string;

  @ApiPropertyOptional({ example: '$', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  simbolo_moneda?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(4)
  decimales_moneda?: number;

  @ApiPropertyOptional({ example: 'IVA', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  etiqueta_impuesto?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  tasa_impuesto_defecto?: number;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  prefijo_orden?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  prefijo_cotizacion?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  prefijo_informe?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  prefijo_remision?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  prefijo_oc?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  prefijo_contrato?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  prefijo_propuesta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  texto_pie_pdf?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  texto_disclaimer_repuestos_cliente?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  garantia_meses_defecto?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  validez_cotizacion_dias_defecto?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiere_firma_cliente_defecto?: boolean;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  storage_prefijo_raiz?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  politica_retencion_mobile_dias?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  modulo_comercial_activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  modulo_inventario_activo?: boolean;

  @ApiPropertyOptional({ description: 'Monto a partir del cual se requiere aprobación de Supervisor' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  umbral_aprobacion_supervisor?: number;

  @ApiPropertyOptional({ description: 'Monto a partir del cual se requiere aprobación de Gerente' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  umbral_aprobacion_gerente?: number;

  @ApiPropertyOptional({ description: 'Descuento porcentual máximo sin aprobación interna (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  descuento_max_sin_aprobacion?: number;

  @ApiPropertyOptional({ description: 'Margen bruto mínimo para alerta amarilla (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  margen_minimo_alerta?: number;

  @ApiPropertyOptional({ description: 'Margen bruto mínimo antes de requerir aprobación gerencial (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  margen_minimo_aprobacion?: number;

  @ApiPropertyOptional({ description: 'Términos y condiciones por defecto para cotizaciones comerciales' })
  @IsOptional()
  @IsString()
  terminos_cotizacion_defecto?: string | null;
}
