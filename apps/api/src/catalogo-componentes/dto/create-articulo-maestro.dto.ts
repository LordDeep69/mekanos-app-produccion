import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { destino_articulo_enum, origen_costo_enum } from '@prisma/client';

export { destino_articulo_enum as DestinoArticulo, origen_costo_enum as OrigenCosto };

/**
 * Escala de precios por volumen para compras
 */
export class EscalaPrecioDto {
  @ApiProperty({ description: 'Cantidad mínima para aplicar el costo', example: 10 })
  @IsNumber()
  @Min(1)
  cantidad_min: number;

  @ApiProperty({ description: 'Costo unitario en esta escala', example: 85000 })
  @IsNumber()
  @Min(0)
  costo_unitario: number;

  @ApiPropertyOptional({ description: 'Porcentaje de descuento estimado frente al precio base', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento_porcentaje?: number;
}

/**
 * Oferta o referencia inicial de un proveedor para el artículo (Cross-Referencing)
 */
export class ArticuloProveedorInicialDto {
  @ApiProperty({ description: 'ID del proveedor en el sistema', example: 3 })
  @IsInt()
  id_proveedor: number;

  @ApiProperty({ description: 'Código o SKU específico del proveedor (Cross-reference)', example: 'FILT-MANN-W712' })
  @IsString()
  @MaxLength(100)
  referencia_proveedor: string;

  @ApiPropertyOptional({ description: 'Marca con la que el proveedor comercializa este artículo', example: 'MANN-FILTER' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_ofrecida?: string;

  @ApiPropertyOptional({ description: 'ID de la marca normalizada ofrecida por el proveedor', example: 1 })
  @IsOptional()
  @IsInt()
  id_marca_ofrecida?: number;

  @ApiPropertyOptional({ description: 'Denominación según la factura del proveedor' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre_segun_proveedor?: string;

  @ApiProperty({ description: 'Costo actual de adquisición negociado', example: 95000 })
  @IsNumber()
  @Min(0)
  costo_actual: number;

  @ApiPropertyOptional({ description: 'Moneda del costo', default: 'COP', example: 'COP' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  moneda?: string = 'COP';

  @ApiPropertyOptional({ description: 'Tiempo de entrega prometido en días hábiles', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tiempo_entrega_dias?: number = 1;

  @ApiPropertyOptional({ description: 'Cantidad mínima de compra (MOQ)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad_minima_compra?: number = 1;

  @ApiPropertyOptional({ description: 'Escalas de precios por volumen', type: [EscalaPrecioDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalaPrecioDto)
  escalas_precios?: EscalaPrecioDto[];

  @ApiPropertyOptional({ description: '¿Es el proveedor principal/preferido para este ítem?', default: false })
  @IsOptional()
  @IsBoolean()
  es_proveedor_preferido?: boolean = false;

  @ApiPropertyOptional({ description: 'Enlace web a la ficha del producto en la tienda del proveedor' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url_producto_proveedor?: string;

  @ApiPropertyOptional({ description: 'Condiciones comerciales o notas del proveedor' })
  @IsOptional()
  @IsString()
  notas?: string;
}

/**
 * DTO Maestro para la creación de cualquier Recurso/Artículo (Agnóstico, Escalable y Enterprise)
 */
export class CreateArticuloMaestroDto {
  // ==========================================
  // 1. IDENTIDAD FÍSICA Y TÉCNICA (AGNOSTICA)
  // ==========================================
  @ApiPropertyOptional({
    description:
      'ID del tipo de componente LEGACY (opcional). La clasificación real es id_categoria; si se omite se usa el tipo comodín GENERAL.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  id_tipo_componente?: number;

  @ApiPropertyOptional({ description: 'Código interno de control empresarial (SKU Maestro)', example: 'INS-00245' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_interno?: string;

  @ApiProperty({ description: 'Referencia del fabricante o modelo neutral', example: 'W712/95' })
  @IsString()
  @MaxLength(100)
  referencia_fabricante: string;

  @ApiPropertyOptional({ description: 'Marca del fabricante original (texto libre de respaldo)', example: 'MANN-FILTER' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string;

  @ApiPropertyOptional({ description: 'ID de la marca normalizada en la tabla marcas', example: 1 })
  @IsOptional()
  @IsInt()
  id_marca?: number;

  @ApiPropertyOptional({ description: 'ID de la categoría técnica taxonómica en categorias_componente', example: 10 })
  @IsOptional()
  @IsInt()
  id_categoria?: number;

  @ApiPropertyOptional({ description: 'Descripción corta o título comercial', example: 'Filtro de Aceite Sintético de Cabina' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion_corta?: string;

  @ApiPropertyOptional({ description: 'Descripción técnica detallada o alcance' })
  @IsOptional()
  @IsString()
  descripcion_detallada?: string;

  @ApiPropertyOptional({ description: 'Especificaciones técnicas en formato JSON libre' })
  @IsOptional()
  especificaciones_tecnicas?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Unidad de medida (texto libre de respaldo)', default: 'UNIDAD', example: 'UNIDAD' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidad_medida?: string = 'UNIDAD';

  @ApiPropertyOptional({ description: 'Código de la unidad de medida normalizada en unidades_medida', example: 'UND' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  codigo_unidad_medida?: string;

  @ApiPropertyOptional({ description: 'Tipo comercial (ORIGINAL, GENERICO, HOMOLOGADO)', default: 'ORIGINAL' })
  @IsOptional()
  @IsString()
  tipo_comercial?: string = 'ORIGINAL';

  // ==========================================
  // 2. POLIMORFISMO: DESTINO OPERATIVO Y BANDERAS
  // ==========================================
  @ApiProperty({
    description: 'Destino operativo del artículo en la empresa',
    enum: destino_articulo_enum,
    default: destino_articulo_enum.INSUMO_SERVICIO,
  })
  @IsEnum(destino_articulo_enum, {
    message: 'El destino_articulo debe ser INSUMO_SERVICIO, REPUESTO_CORRECTIVO, HERRAMIENTA_ACTIVO, DOTACION_EPP o CONSUMIBLE_TALLER',
  })
  destino_articulo: destino_articulo_enum = destino_articulo_enum.INSUMO_SERVICIO;

  @ApiPropertyOptional({ description: '¿Se abastece mediante compras a proveedores?', default: true })
  @IsOptional()
  @IsBoolean()
  es_comprable?: boolean = true;

  @ApiPropertyOptional({ description: '¿Se almacena y controla en inventario/bodega?', default: true })
  @IsOptional()
  @IsBoolean()
  es_inventariable?: boolean = true;

  @ApiPropertyOptional({ description: '¿Se factura o imputa a órdenes de servicio a clientes?', default: true })
  @IsOptional()
  @IsBoolean()
  es_facturable?: boolean = true;

  // ==========================================
  // 3. CAMPOS CONDICIONALES PARA HERRAMIENTAS Y ACTIVOS FIJOS
  // ==========================================
  @ApiPropertyOptional({ description: '¿Requiere rastreo individual por serial o placa física?', default: false })
  @IsOptional()
  @IsBoolean()
  requiere_serializacion?: boolean = false;

  @ApiPropertyOptional({ description: '¿Es un activo fijo depreciable de la empresa?', default: false })
  @IsOptional()
  @IsBoolean()
  es_activo_fijo?: boolean = false;

  @ApiPropertyOptional({ description: 'Número de serie único del fabricante' })
  @ValidateIf(o => o.destino_articulo === destino_articulo_enum.HERRAMIENTA_ACTIVO || o.requiere_serializacion === true)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_activo?: string;

  @ApiPropertyOptional({ description: 'Código de placa de inventario físico interno' })
  @ValidateIf(o => o.destino_articulo === destino_articulo_enum.HERRAMIENTA_ACTIVO || o.es_activo_fijo === true)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  placa_inventario?: string;

  @ApiPropertyOptional({ description: 'Frecuencia recomendada de mantenimiento o calibración (en meses)' })
  @ValidateIf(o => o.destino_articulo === destino_articulo_enum.HERRAMIENTA_ACTIVO)
  @IsOptional()
  @IsInt()
  @Min(1)
  frecuencia_mantenimiento_meses?: number;

  // ==========================================
  // 4. GESTIÓN DE STOCK Y ALMACÉN
  // ==========================================
  @ApiPropertyOptional({ description: 'Nivel mínimo de stock para alertas', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock_minimo?: number = 0;

  @ApiPropertyOptional({ description: 'Stock inicial en almacén', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock_actual?: number;

  // ==========================================
  // 5. GESTIÓN ECONÓMICA Y PRECIOS DE VENTA (INSUMOS)
  // ==========================================
  @ApiPropertyOptional({ description: 'Precio base de compra estimado / costo de referencia', example: 95000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_compra?: number;

  @ApiPropertyOptional({ description: 'Precio sugerido de venta al cliente final', example: 145000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_venta?: number;

  @ApiPropertyOptional({ description: 'Margen de utilidad porcentual esperado', example: 35.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  margen_utilidad_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Moneda predeterminada', default: 'COP' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  moneda?: string = 'COP';

  // ==========================================
  // 6. MATRIZ INICIAL DE REFERENCIAS CRUZADAS Y PROVEEDORES
  // ==========================================
  @ApiPropertyOptional({
    description: 'Arreglo de proveedores y referencias cruzadas iniciales',
    type: [ArticuloProveedorInicialDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticuloProveedorInicialDto)
  proveedores_iniciales?: ArticuloProveedorInicialDto[];

  @ApiPropertyOptional({ description: 'ID del proveedor principal (atajo si no se envía array)' })
  @IsOptional()
  @IsInt()
  id_proveedor_principal?: number;

  @ApiPropertyOptional({ description: 'Observaciones generales o notas de uso' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Notas de instalación o seguridad' })
  @IsOptional()
  @IsString()
  notas_instalacion?: string;
}
