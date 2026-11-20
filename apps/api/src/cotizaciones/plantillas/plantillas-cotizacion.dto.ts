import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PlantillaCotizacionItemDto {
  @ApiProperty({ enum: ['SERVICIO', 'COMPONENTE', 'OTRO'] })
  @IsIn(['SERVICIO', 'COMPONENTE', 'OTRO'])
  tipo_linea!: 'SERVICIO' | 'COMPONENTE' | 'OTRO';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  id_servicio?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  id_componente?: number | null;

  @ApiPropertyOptional({ description: 'Para tipo_linea = OTRO (TRANSPORTE, VIATICOS, POLIZA, DISPOSICION_AMBIENTAL, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  categoria_rubro?: string | null;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  descripcion!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  detalle_calculo?: string | null;

  @ApiPropertyOptional({ default: 'unidad' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidad?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  cantidad_base?: number;

  @ApiPropertyOptional({
    description: 'Si true, escala cantidad x N equipos al aplicar plantilla. Si false, queda fijo (ej. transporte o póliza).',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  es_por_equipo?: boolean;

  @ApiPropertyOptional({
    description: 'Si true y tiene id_servicio/id_componente, toma el precio vigente de catálogo al aplicar.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  usar_precio_catalogo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_unitario_fijo?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_unitario_fijo?: number | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible_cliente?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  es_opcional?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  iva_aplicable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  garantia_meses?: number | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden_item?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string | null;
}

export class CreatePlantillaCotizacionDto {
  @ApiPropertyOptional({ description: 'Código único (se genera automáticamente si se omite)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  codigo_plantilla?: string;

  @ApiProperty({ example: 'Suministro e Instalación de Baterías' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  nombre!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @ApiPropertyOptional({ default: 'SERVICIO_TECNICO' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tipo_cotizacion?: string;

  @ApiPropertyOptional({ description: 'Opcional: tipo de equipo al que aplica preferentemente (null = universal)' })
  @IsOptional()
  @IsInt()
  id_tipo_equipo?: number | null;

  @ApiPropertyOptional({ description: 'Opcional: modelo OEM exacto al que aplica (null = cualquier modelo)' })
  @IsOptional()
  @IsInt()
  id_modelo_equipo?: number | null;

  @ApiPropertyOptional({ description: 'Opcional: subsistema/módulo técnico específico' })
  @IsOptional()
  @IsInt()
  id_modulo?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  asunto_sugerido?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion_general?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alcance_trabajo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exclusiones?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terminos_condiciones?: string | null;

  @ApiPropertyOptional({ default: 'CONTADO' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  forma_pago?: string;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  meses_garantia?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  tiempo_estimado_dias?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  usa_aiu?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_admin_porcentaje?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_imprevistos_porcentaje?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_utilidad_porcentaje?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  iva_sobre_utilidad_aiu?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ type: [PlantillaCotizacionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlantillaCotizacionItemDto)
  items?: PlantillaCotizacionItemDto[];
}

export class UpdatePlantillaCotizacionDto extends CreatePlantillaCotizacionDto {}

export class AplicarPlantillaDto {
  @ApiPropertyOptional({
    description: 'Si true, reemplaza los ítems actuales; si false, los agrega al final',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  reemplazar_items?: boolean;

  @ApiPropertyOptional({
    description: 'Si true, sobrescribe asunto/alcance/exclusiones/términos/AIU desde la plantilla cuando estén vacíos o forzados',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  aplicar_textos_comerciales?: boolean;

  @ApiPropertyOptional({
    description: 'Multiplicador manual de equipos (si se omite, usa la cantidad de equipos vinculados a la cotización, mín. 1)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  multiplicador_equipos?: number;
}

export class ImportarBomModeloDto {
  @ApiPropertyOptional({
    description: 'Multiplicador de equipos (si se omite, cuenta cuántos equipos de este modelo están vinculados a la cotización, mín. 1)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  multiplicador_equipos?: number;

  @ApiPropertyOptional({
    description: 'Si true, importa también repuestos con rol_bom ALTERNO como opcionales',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  incluir_alternos_como_opcionales?: boolean;
}

export class GuardarComoPlantillaDto {
  @ApiProperty({ example: 'Suministro de Baterías Planta 500kVA' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  nombre!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  codigo_plantilla?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Si se omite, hereda el tipo de equipo del primer activo de la cotización' })
  @IsOptional()
  @IsInt()
  id_tipo_equipo?: number | null;

  @ApiPropertyOptional({ description: 'Si se omite, hereda el modelo OEM si todos los activos comparten modelo' })
  @IsOptional()
  @IsInt()
  id_modelo_equipo?: number | null;

  @ApiPropertyOptional({ description: 'Normalizar cantidades dividiendo por número de equipos vinculados', default: true })
  @IsOptional()
  @IsBoolean()
  normalizar_por_equipo?: boolean;
}
