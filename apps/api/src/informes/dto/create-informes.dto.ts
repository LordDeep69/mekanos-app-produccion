import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en informes.
 */
export class CreateInformesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_informe?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_orden_servicio!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_plantilla_informe?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_generacion?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  generado_por!: number;

  @ApiPropertyOptional({ enum: ["BORRADOR","REVISADO","APROBADO","ENVIADO"] })
  @IsOptional()
  @IsIn(["BORRADOR","REVISADO","APROBADO","ENVIADO"])
  estado_informe?: "BORRADOR" | "REVISADO" | "APROBADO" | "ENVIADO";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  revisado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_revision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones_revision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  aprobado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_aprobacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_documento_pdf?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cliente_visualizo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_visualizacion_cliente?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cliente_aprobo?: boolean;

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
