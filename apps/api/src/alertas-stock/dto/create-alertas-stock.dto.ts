import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en alertas_stock.
 */
export class CreateAlertasStockDto {
  @ApiProperty({ enum: ["STOCK_MINIMO","VENCIMIENTO_CRITICO","VENCIMIENTO_PROXIMO","DEVOLUCION_VENCIDA","LOTE_AGOTADO"] })
  @IsIn(["STOCK_MINIMO","VENCIMIENTO_CRITICO","VENCIMIENTO_PROXIMO","DEVOLUCION_VENCIDA","LOTE_AGOTADO"])
  tipo_alerta!: "STOCK_MINIMO" | "VENCIMIENTO_CRITICO" | "VENCIMIENTO_PROXIMO" | "DEVOLUCION_VENCIDA" | "LOTE_AGOTADO";

  @ApiProperty({ enum: ["OK","ADVERTENCIA","CRITICO","INFORMATIVO"] })
  @IsIn(["OK","ADVERTENCIA","CRITICO","INFORMATIVO"])
  nivel!: "OK" | "ADVERTENCIA" | "CRITICO" | "INFORMATIVO";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_componente?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_lote?: number;

  @ApiProperty()
  @IsString()
  mensaje!: string;

  @ApiPropertyOptional({ enum: ["PENDIENTE","VISTA","EN_PROCESO","RESUELTA"] })
  @IsOptional()
  @IsIn(["PENDIENTE","VISTA","EN_PROCESO","RESUELTA"])
  estado?: "PENDIENTE" | "VISTA" | "EN_PROCESO" | "RESUELTA";

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_generacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_resolucion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  resuelto_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
