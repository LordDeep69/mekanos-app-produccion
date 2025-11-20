import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CrearUbicacionDto {
  @IsNotEmpty({ message: 'El codigo de ubicacion es requerido' })
  @IsString()
  @MinLength(3, { message: 'El codigo debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El codigo no puede exceder 50 caracteres' })
  codigo_ubicacion: string;

  @IsNotEmpty({ message: 'La zona es requerida' })
  @IsString()
  @MaxLength(100, { message: 'La zona no puede exceder 100 caracteres' })
  zona: string;

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
}
