import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * CREATE COTIZACION DTO (EAM-CPQ Universal)
 */
export class CreateCotizacionDto {
  @ApiProperty({ description: 'ID del cliente', example: 5 })
  @IsNotEmpty({ message: 'id_cliente es requerido' })
  @IsNumber({}, { message: 'id_cliente debe ser un número' })
  id_cliente!: number;

  @ApiPropertyOptional({ description: 'ID de la sede del cliente (opcional)', example: 12 })
  @IsOptional()
  @IsNumber({}, { message: 'id_sede debe ser un número' })
  id_sede?: number;

  @ApiPropertyOptional({ description: 'ID del equipo principal (legacy/compatibilidad)', example: 45 })
  @IsOptional()
  @IsNumber({}, { message: 'id_equipo debe ser un número' })
  id_equipo?: number;

  @ApiPropertyOptional({ description: 'Destinatario comercial ("Atención a / Representante")', example: 'Ing. María Fernanda Gómez' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  atencion_a_nombre?: string | null;

  @ApiPropertyOptional({ description: 'Cargo o dependencia del destinatario comercial', example: 'Administración' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  atencion_a_cargo?: string | null;

  @ApiPropertyOptional({
    description: 'Lista N:M de IDs de equipos cubiertos por esta cotización',
    type: [Number],
    example: [45, 46],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  equipos_ids?: number[];

  @ApiPropertyOptional({
    description: 'Tipo de cotización (SERVICIO_TECNICO, SUMINISTRO, CORRECTIVO, PROYECTO, CONTRATO, etc.)',
    default: 'SERVICIO_TECNICO',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tipo_cotizacion?: string;

  @ApiPropertyOptional({ description: 'ID de plantilla de origen si aplica' })
  @IsOptional()
  @IsInt()
  id_plantilla_origen?: number;

  @ApiPropertyOptional({ description: 'ID de propuesta correctiva de origen si aplica' })
  @IsOptional()
  @IsInt()
  id_propuesta_origen?: number;

  @ApiPropertyOptional({ description: 'Código ISO de moneda (hereda configuración de organización si se omite)', example: 'COP' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  moneda?: string;

  @ApiProperty({ description: 'Fecha de cotización', example: '2026-11-20' })
  @IsNotEmpty({ message: 'fecha_cotizacion es requerida' })
  @IsDateString({}, { message: 'fecha_cotizacion debe ser una fecha válida (ISO 8601)' })
  fecha_cotizacion!: string;

  @ApiProperty({ description: 'Fecha de vencimiento de la cotización', example: '2026-12-20' })
  @IsNotEmpty({ message: 'fecha_vencimiento es requerida' })
  @IsDateString({}, { message: 'fecha_vencimiento debe ser una fecha válida (ISO 8601)' })
  fecha_vencimiento!: string;

  @ApiProperty({
    description: 'Asunto/título de la cotización',
    example: 'Suministro e instalación de bancos de baterías',
  })
  @IsNotEmpty({ message: 'asunto es requerido' })
  @IsString({ message: 'asunto debe ser texto' })
  @MaxLength(300)
  asunto!: string;

  @ApiPropertyOptional({ description: 'Descripción general del servicio' })
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

  @ApiPropertyOptional({ description: 'Porcentaje de descuento global (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Porcentaje de IVA (0-100). Si se omite hereda tasa de la organización.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  iva_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Activar estructura opcional AIU (Administración, Imprevistos, Utilidad)', default: false })
  @IsOptional()
  @IsBoolean()
  usa_aiu?: boolean;

  @ApiPropertyOptional({ description: 'Porcentaje Administración AIU (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_admin_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Porcentaje Imprevistos AIU (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_imprevistos_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Porcentaje Utilidad AIU (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_utilidad_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Si true y usa_aiu=true, el IVA se calcula únicamente sobre Utilidad AIU', default: false })
  @IsOptional()
  @IsBoolean()
  iva_sobre_utilidad_aiu?: boolean;

  @ApiPropertyOptional({ description: 'Modo de agrupación visual en PDF (POR_CATEGORIA | POR_EQUIPO)', default: 'POR_CATEGORIA' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  modo_agrupacion_pdf?: string;

  @ApiPropertyOptional({ description: 'Desglosar precios unitarios y subtotales por rubro en PDF (false = Suma Alzada compacta)', default: false })
  @IsOptional()
  @IsBoolean()
  mostrar_desglose_precios?: boolean;

  @ApiPropertyOptional({ description: 'Tiempo estimado en días', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tiempo_estimado_dias?: number;

  @ApiPropertyOptional({ description: 'Forma de pago', example: 'CONTADO' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  forma_pago?: string;

  @ApiPropertyOptional({ description: 'Términos y condiciones' })
  @IsOptional()
  @IsString()
  terminos_condiciones?: string;

  @ApiPropertyOptional({ description: 'Garantía en meses', example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  meses_garantia?: number;

  @ApiPropertyOptional({ description: 'Observaciones de garantía' })
  @IsOptional()
  @IsString()
  observaciones_garantia?: string;

  @ApiPropertyOptional({ description: 'ID del empleado que elabora (opcional: se infiere del usuario autenticado)' })
  @IsOptional()
  @IsInt()
  elaborada_por?: number;
}
