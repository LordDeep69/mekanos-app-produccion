import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en ordenes_compra.
 */
export class CreateOrdenesCompraDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_orden_compra?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_proveedor!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_solicitud?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_necesidad?: string;

  @ApiPropertyOptional({ enum: ["BORRADOR","ENVIADA","PARCIAL","COMPLETADA","CANCELADA"] })
  @IsOptional()
  @IsIn(["BORRADOR","ENVIADA","PARCIAL","COMPLETADA","CANCELADA"])
  estado?: "BORRADOR" | "ENVIADA" | "PARCIAL" | "COMPLETADA" | "CANCELADA";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  solicitada_por!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  aprobada_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_aprobacion?: string;
}
