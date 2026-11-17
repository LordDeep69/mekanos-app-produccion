import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en historial_contrato.
 */
export class CreateHistorialContratoDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_contrato!: number;

  @ApiProperty()
  @IsString()
  campo_modificado!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  valor_anterior?: string;

  @ApiProperty()
  @IsString()
  valor_nuevo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo_cambio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_cambio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modificado_por?: number;
}
