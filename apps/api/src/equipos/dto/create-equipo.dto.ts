import { IsString, IsInt, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';

/**
 * DTO para crear un equipo
 */
export class CreateEquipoDto {
  @IsString({ message: 'Código debe ser una cadena de texto' })
  @MinLength(1, { message: 'Código no puede estar vacío' })
  @MaxLength(50, { message: 'Código no puede exceder 50 caracteres' })
  @Matches(/^[A-Z0-9\-]+$/, { 
    message: 'Código debe contener solo letras mayúsculas, números y guiones' 
  })
  codigo!: string;

  @IsString({ message: 'Marca debe ser una cadena de texto' })
  @MinLength(2, { message: 'Marca debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'Marca no puede exceder 100 caracteres' })
  marca!: string;

  @IsString({ message: 'Modelo debe ser una cadena de texto' })
  @MinLength(2, { message: 'Modelo debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'Modelo no puede exceder 100 caracteres' })
  modelo!: string;

  @IsOptional()
  @IsString({ message: 'Serie debe ser una cadena de texto' })
  @MaxLength(100, { message: 'Serie no puede exceder 100 caracteres' })
  serie?: string;

  @IsInt({ message: 'ClienteId debe ser un número entero' })
  clienteId!: number;

  @IsOptional()
  @IsInt({ message: 'SedeId debe ser un número entero' })
  sedeId?: number;

  @IsInt({ message: 'TipoEquipoId debe ser un número entero' })
  tipoEquipoId!: number;

  @IsOptional()
  @IsString({ message: 'NombreEquipo debe ser una cadena de texto' })
  @MaxLength(200, { message: 'NombreEquipo no puede exceder 200 caracteres' })
  nombreEquipo?: string;
}
