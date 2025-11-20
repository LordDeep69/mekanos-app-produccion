import { categoria_motivo_ajuste_enum } from '@prisma/client';
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

/**
 * DTO para crear motivo de ajuste inventario
 */
export class CreateMotivosAjusteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  codigo_motivo: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  nombre_motivo: string;

  @IsEnum(categoria_motivo_ajuste_enum)
  @IsNotEmpty()
  categoria: categoria_motivo_ajuste_enum;

  @IsBoolean()
  requiere_justificacion_detallada: boolean;

  @IsBoolean()
  requiere_aprobacion_gerencia: boolean;
}
