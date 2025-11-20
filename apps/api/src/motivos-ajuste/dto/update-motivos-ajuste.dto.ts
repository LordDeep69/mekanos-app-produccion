import { categoria_motivo_ajuste_enum } from '@prisma/client';
import {
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

/**
 * DTO para actualizar motivo de ajuste inventario
 */
export class UpdateMotivosAjusteDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  codigo_motivo?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre_motivo?: string;

  @IsOptional()
  @IsEnum(categoria_motivo_ajuste_enum)
  categoria?: categoria_motivo_ajuste_enum;

  @IsOptional()
  @IsBoolean()
  requiere_justificacion_detallada?: boolean;

  @IsOptional()
  @IsBoolean()
  requiere_aprobacion_gerencia?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
