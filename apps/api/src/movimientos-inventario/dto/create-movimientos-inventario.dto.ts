import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en movimientos_inventario.
 */
export class CreateMovimientosInventarioDto {
  @ApiProperty({ enum: ["ENTRADA","SALIDA","AJUSTE","TRANSFERENCIA"] })
  @IsIn(["ENTRADA","SALIDA","AJUSTE","TRANSFERENCIA"])
  tipo_movimiento!: "ENTRADA" | "SALIDA" | "AJUSTE" | "TRANSFERENCIA";

  @ApiProperty({ enum: ["COMPRA","CONSUMO_OS","REMISION","DEVOLUCION","CONTEO_FISICO","MERMA","CORRECCION_ERROR","INVENTARIO_INICIAL"] })
  @IsIn(["COMPRA","CONSUMO_OS","REMISION","DEVOLUCION","CONTEO_FISICO","MERMA","CORRECCION_ERROR","INVENTARIO_INICIAL"])
  origen_movimiento!: "COMPRA" | "CONSUMO_OS" | "REMISION" | "DEVOLUCION" | "CONTEO_FISICO" | "MERMA" | "CORRECCION_ERROR" | "INVENTARIO_INICIAL";

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_componente!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  cantidad!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costo_unitario?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_ubicacion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_lote?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_orden_servicio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_orden_compra?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_remision?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justificacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_movimiento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  realizado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  aprobado_por?: number;
}
