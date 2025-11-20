import {
    IsBoolean,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class ActualizarUbicacionDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El codigo debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El codigo no puede exceder 50 caracteres' })
  codigo_ubicacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La zona no puede exceder 100 caracteres' })
  zona?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El pasillo no puede exceder 50 caracteres' })
  pasillo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El estante no puede exceder 50 caracteres' })
  estante?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El nivel no puede exceder 50 caracteres' })
  nivel?: string;

  @IsOptional()
  @IsBoolean({ message: 'Activo debe ser un valor booleano' })
  activo?: boolean;
}
