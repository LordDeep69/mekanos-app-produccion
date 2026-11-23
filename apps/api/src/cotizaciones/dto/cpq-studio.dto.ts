import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';

export class CreateItemOtroDto {
  @ApiPropertyOptional({ description: 'ID del equipo asociado (opcional)' })
  @IsOptional()
  @IsInt()
  id_equipo?: number | null;

  @ApiPropertyOptional({
    description:
      'Categoría del rubro (TRANSPORTE, VIATICOS, POLIZA, ALQUILER, DISPOSICION_AMBIENTAL, SUBCONTRATO, OTRO o personalizado)',
    default: 'OTRO',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  categoria_rubro?: string;

  @ApiProperty({ description: 'Descripción del rubro o gasto', example: 'Transporte técnico y movilización equipos ida y vuelta' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  descripcion!: string;

  @ApiPropertyOptional({ description: 'Detalle o fórmula de cálculo', example: '2 técnicos x 2 días' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  detalle_calculo?: string;

  @ApiPropertyOptional({ description: 'Cantidad', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  cantidad?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida', default: 'global' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidad?: string;

  @ApiPropertyOptional({ description: 'Costo unitario interno (para cálculo de margen)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_unitario?: number;

  @ApiPropertyOptional({ description: 'Precio unitario al cliente (0 si está absorbido o incluido)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_unitario?: number;

  @ApiPropertyOptional({ description: 'Descuento porcentual (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiPropertyOptional({
    description: 'Si true, aparece en PDF y suma al total cliente. Si false, es costo indirecto absorbido (solo afecta rentabilidad).',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  visible_cliente?: boolean;

  @ApiPropertyOptional({ description: 'Ítem opcional', default: false })
  @IsOptional()
  @IsBoolean()
  es_opcional?: boolean;

  @ApiPropertyOptional({ description: 'Grava IVA/impuesto', default: true })
  @IsOptional()
  @IsBoolean()
  iva_aplicable?: boolean;

  @ApiPropertyOptional({ description: 'Orden de visualización', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden_item?: number;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateItemOtroDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  id_equipo?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  categoria_rubro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  detalle_calculo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  cantidad?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidad?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_unitario?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_unitario?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visible_cliente?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  es_opcional?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  iva_aplicable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  orden_item?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string | null;
}

export class EquipoCotizacionInputDto {
  @ApiProperty()
  @IsInt()
  id_equipo!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  orden_secuencia?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas_alcance?: string;
}

export class SyncEquiposCotizacionDto {
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  equipos_ids?: number[];

  @ApiPropertyOptional({ type: [EquipoCotizacionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipoCotizacionInputDto)
  equipos?: EquipoCotizacionInputDto[];
}

export class StudioServicioItemDto {
  @IsOptional()
  @IsInt()
  id_servicio?: number | null;

  @IsOptional()
  @IsInt()
  id_equipo?: number | null;

  @IsOptional()
  @IsString()
  descripcion_personalizada?: string;

  @IsNumber()
  @Min(0.01)
  cantidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidad?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_unitario?: number;

  @IsNumber()
  @Min(0)
  precio_unitario!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @IsOptional()
  @IsBoolean()
  es_opcional?: boolean;

  @IsOptional()
  @IsBoolean()
  iva_aplicable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  seccion_titulo?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  justificacion_precio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden_item?: number;
}

export class StudioComponenteItemDto {
  @IsOptional()
  @IsInt()
  id_componente?: number | null;

  @IsOptional()
  @IsInt()
  id_tipo_componente?: number | null;

  @IsOptional()
  @IsInt()
  id_equipo?: number | null;

  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  descripcion!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_manual?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_manual?: string;

  @IsNumber()
  @Min(0.01)
  cantidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidad?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_unitario?: number;

  @IsNumber()
  @Min(0)
  precio_unitario!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @IsOptional()
  @IsBoolean()
  es_opcional?: boolean;

  @IsOptional()
  @IsBoolean()
  iva_aplicable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  seccion_titulo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  garantia_meses?: number;

  @IsOptional()
  @IsString()
  observaciones_garantia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden_item?: number;
}

export class GuardarStudioCompletoDto {
  @IsOptional()
  @IsInt()
  id_cliente?: number;

  @IsOptional()
  @IsInt()
  id_sede?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  atencion_a_nombre?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  atencion_a_cargo?: string | null;

  @IsOptional()
  @IsInt()
  elaborada_por?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tipo_cotizacion?: string;

  @IsOptional()
  @IsInt()
  id_plantilla_origen?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  moneda?: string;

  @IsOptional()
  @IsDateString()
  fecha_cotizacion?: string;

  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  asunto?: string;

  @IsOptional()
  @IsString()
  descripcion_general?: string | null;

  @IsOptional()
  @IsString()
  alcance_trabajo?: string | null;

  @IsOptional()
  @IsString()
  exclusiones?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  iva_porcentaje?: number;

  @IsOptional()
  @IsBoolean()
  usa_aiu?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_admin_porcentaje?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_imprevistos_porcentaje?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  aiu_utilidad_porcentaje?: number;

  @IsOptional()
  @IsBoolean()
  iva_sobre_utilidad_aiu?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  modo_agrupacion_pdf?: string;

  @IsOptional()
  @IsBoolean()
  mostrar_desglose_precios?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  forma_pago?: string;

  @IsOptional()
  @IsString()
  terminos_condiciones?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  meses_garantia?: number;

  @IsOptional()
  @IsString()
  observaciones_garantia?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  tiempo_estimado_dias?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipoCotizacionInputDto)
  equipos?: EquipoCotizacionInputDto[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  equipos_ids?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudioServicioItemDto)
  items_servicios?: StudioServicioItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudioComponenteItemDto)
  items_componentes?: StudioComponenteItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemOtroDto)
  items_otros?: CreateItemOtroDto[];
}

export class ReabrirBorradorDto {
  @ApiPropertyOptional({
    description: 'Motivo de reapertura / renegociación (queda registrado en versiones_cotizacion)',
    example: 'Ajuste de alcance y descuento solicitado por cliente',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo_cambio?: string;
}

export class ConvertirCotizacionOrdenDto {
  @ApiPropertyOptional({ description: 'ID del tipo de servicio para la Orden de Servicio' })
  @IsOptional()
  @IsInt()
  id_tipo_servicio?: number;

  @ApiPropertyOptional({ description: 'Fecha programada de ejecución (ISO)' })
  @IsOptional()
  @IsDateString()
  fecha_programada?: string;

  @ApiPropertyOptional({ description: 'ID del técnico asignado (si se asigna pasa a estado ASIGNADA)' })
  @IsOptional()
  @IsInt()
  id_tecnico_asignado?: number;

  @ApiPropertyOptional({ description: 'Prioridad de la orden (BAJA | NORMAL | ALTA | URGENTE)', default: 'NORMAL' })
  @IsOptional()
  @IsString()
  prioridad?: string;

  @ApiPropertyOptional({ description: 'Equipos fallback si la cotización no tenía equipos vinculados', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  equipos_ids?: number[];

  @ApiPropertyOptional({ description: 'Notas adicionales para la descripción inicial de la orden' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ActualizarPresentacionPdfDto {
  @ApiProperty({
    description: 'Desglosar precios unitarios y subtotales por rubro en PDF (false = Suma Alzada compacta)',
  })
  @IsBoolean()
  mostrar_desglose_precios: boolean;
}
