import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en proveedores.
 */
export class CreateProveedoresDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_persona!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigo_proveedor?: string;

  @ApiPropertyOptional({ enum: ["NACIONAL","INTERNACIONAL"] })
  @IsOptional()
  @IsIn(["NACIONAL","INTERNACIONAL"])
  tipo_proveedor?: "NACIONAL" | "INTERNACIONAL";

  @ApiProperty({ enum: ["REPUESTOS","SERVICIOS","CONTRATISTA","SUMINISTROS","EQUIPOS","MIXTO"] })
  @IsIn(["REPUESTOS","SERVICIOS","CONTRATISTA","SUMINISTROS","EQUIPOS","MIXTO"])
  categoria_proveedor!: "REPUESTOS" | "SERVICIOS" | "CONTRATISTA" | "SUMINISTROS" | "EQUIPOS" | "MIXTO";

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  responsable_iva?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tiempo_entrega_dias?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  servicios_ofrecidos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tarifa_hora?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tarifa_dia?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_arl?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre_arl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_vencimiento_arl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  realiza_entregas?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costo_envio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zona_cobertura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  proveedor_activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bloqueado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo_bloqueo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_bloqueo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bloqueado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  creado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_creacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modificado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_modificacion?: string;
}
