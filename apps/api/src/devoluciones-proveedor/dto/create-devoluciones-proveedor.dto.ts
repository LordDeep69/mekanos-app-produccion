import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en devoluciones_proveedor.
 */
export class CreateDevolucionesProveedorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_devolucion?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_orden_compra!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_lote?: number;

  @ApiProperty({ enum: ["DEFECTUOSO","INCORRECTO","PROXIMO_VENCER","EXCESO"] })
  @IsIn(["DEFECTUOSO","INCORRECTO","PROXIMO_VENCER","EXCESO"])
  motivo!: "DEFECTUOSO" | "INCORRECTO" | "PROXIMO_VENCER" | "EXCESO";

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  cantidad_devuelta!: number;

  @ApiPropertyOptional({ enum: ["SOLICITADA","APROBADA_PROVEEDOR","RETIRADA","ACREDITADA"] })
  @IsOptional()
  @IsIn(["SOLICITADA","APROBADA_PROVEEDOR","RETIRADA","ACREDITADA"])
  estado_devolucion?: "SOLICITADA" | "APROBADA_PROVEEDOR" | "RETIRADA" | "ACREDITADA";

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
  @IsDateString()
  fecha_solicitud?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_devolucion?: string;
}
