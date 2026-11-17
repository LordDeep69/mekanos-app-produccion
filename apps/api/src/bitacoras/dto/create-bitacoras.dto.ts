import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en bitacoras.
 */
export class CreateBitacorasDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_bitacora?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_cliente!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  mes!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  anio!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_generacion?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  generado_por!: number;

  @ApiPropertyOptional({ enum: ["BORRADOR","ENVIADA","APROBADA"] })
  @IsOptional()
  @IsIn(["BORRADOR","ENVIADA","APROBADA"])
  estado_bitacora?: "BORRADOR" | "ENVIADA" | "APROBADA";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_documento_pdf?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cantidad_informes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  enviada_cliente_fecha?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metodo_envio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_aprobacion_cliente?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firma_digital_cliente?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
