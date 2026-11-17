import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en catalogo_servicios.
 */
export class CreateCatalogoServiciosDto {
  @ApiProperty()
  @IsString()
  codigo_servicio!: string;

  @ApiProperty()
  @IsString()
  nombre_servicio!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ enum: ["PREVENTIVO","CORRECTIVO","EMERGENCIA","INSPECCION","ESPECIALIZADO","DIAGNOSTICO"] })
  @IsIn(["PREVENTIVO","CORRECTIVO","EMERGENCIA","INSPECCION","ESPECIALIZADO","DIAGNOSTICO"])
  categoria!: "PREVENTIVO" | "CORRECTIVO" | "EMERGENCIA" | "INSPECCION" | "ESPECIALIZADO" | "DIAGNOSTICO";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_tipo_servicio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_tipo_equipo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duracion_estimada_horas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiere_certificacion?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipo_certificacion_requerida?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  precio_base?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  incluye_repuestos?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

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
