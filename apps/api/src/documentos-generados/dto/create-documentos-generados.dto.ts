import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en documentos_generados.
 */
export class CreateDocumentosGeneradosDto {
  @ApiProperty({ enum: ["INFORME_SERVICIO","BITACORA_MENSUAL","COTIZACION","PROPUESTA"] })
  @IsIn(["INFORME_SERVICIO","BITACORA_MENSUAL","COTIZACION","PROPUESTA"])
  tipo_documento!: "INFORME_SERVICIO" | "BITACORA_MENSUAL" | "COTIZACION" | "PROPUESTA";

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_referencia!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_documento?: string;

  @ApiProperty()
  @IsString()
  ruta_archivo!: string;

  @ApiProperty()
  @IsString()
  hash_sha256!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  tama_o_bytes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numero_paginas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_generacion?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  generado_por!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  herramienta_generacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  veces_descargado?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_ultima_descarga?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_usuario_ultima_descarga?: number;
}
