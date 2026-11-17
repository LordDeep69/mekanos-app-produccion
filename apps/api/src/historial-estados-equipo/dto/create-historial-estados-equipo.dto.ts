import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en historial_estados_equipo.
 */
export class CreateHistorialEstadosEquipoDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_equipo!: number;

  @ApiPropertyOptional({ enum: ["OPERATIVO","STANDBY","INACTIVO","EN_REPARACION","FUERA_SERVICIO","BAJA"] })
  @IsOptional()
  @IsIn(["OPERATIVO","STANDBY","INACTIVO","EN_REPARACION","FUERA_SERVICIO","BAJA"])
  estado_anterior?: "OPERATIVO" | "STANDBY" | "INACTIVO" | "EN_REPARACION" | "FUERA_SERVICIO" | "BAJA";

  @ApiProperty({ enum: ["OPERATIVO","STANDBY","INACTIVO","EN_REPARACION","FUERA_SERVICIO","BAJA"] })
  @IsIn(["OPERATIVO","STANDBY","INACTIVO","EN_REPARACION","FUERA_SERVICIO","BAJA"])
  estado_nuevo!: "OPERATIVO" | "STANDBY" | "INACTIVO" | "EN_REPARACION" | "FUERA_SERVICIO" | "BAJA";

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_cambio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo_cambio?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  cambiado_por!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  contexto?: Record<string, unknown> | unknown[];
}
