import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en lotes_componentes.
 */
export class CreateLotesComponentesDto {
  @ApiProperty()
  @IsString()
  codigo_lote!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_componente!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_fabricacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  cantidad_inicial!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  cantidad_actual!: number;

  @ApiPropertyOptional({ enum: ["DISPONIBLE","VENCIDO","CUARENTENA","AGOTADO"] })
  @IsOptional()
  @IsIn(["DISPONIBLE","VENCIDO","CUARENTENA","AGOTADO"])
  estado_lote?: "DISPONIBLE" | "VENCIDO" | "CUARENTENA" | "AGOTADO";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_proveedor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_factura_proveedor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_ingreso?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  ingresado_por!: number;
}
