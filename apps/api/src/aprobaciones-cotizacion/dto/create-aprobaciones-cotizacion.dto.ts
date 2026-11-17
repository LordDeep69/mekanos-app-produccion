import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en aprobaciones_cotizacion.
 */
export class CreateAprobacionesCotizacionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_cotizacion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_propuesta?: number;

  @ApiProperty({ enum: ["SUPERVISOR","GERENTE","DIRECCION","NINGUNO"] })
  @IsIn(["SUPERVISOR","GERENTE","DIRECCION","NINGUNO"])
  nivel_aprobacion!: "SUPERVISOR" | "GERENTE" | "DIRECCION" | "NINGUNO";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  razon_nivel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estado_aprobacion?: string;

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
  @IsString()
  observaciones_solicitante?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  aprobada_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_respuesta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones_aprobador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  metadata?: Record<string, unknown> | unknown[];
}
