import { IsString, IsOptional, MaxLength, MinLength, IsEnum } from 'class-validator';
import { EstadoEquipoEnum } from '@mekanos/core';

/**
 * DTO para actualizar un equipo
 */
export class UpdateEquipoDto {
  @IsOptional()
  @IsString({ message: 'Marca debe ser una cadena de texto' })
  @MinLength(2, { message: 'Marca debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'Marca no puede exceder 100 caracteres' })
  marca?: string;

  @IsOptional()
  @IsString({ message: 'Modelo debe ser una cadena de texto' })
  @MinLength(2, { message: 'Modelo debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'Modelo no puede exceder 100 caracteres' })
  modelo?: string;

  @IsOptional()
  @IsString({ message: 'Serie debe ser una cadena de texto' })
  @MaxLength(100, { message: 'Serie no puede exceder 100 caracteres' })
  serie?: string;

  @IsOptional()
  @IsString({ message: 'NombreEquipo debe ser una cadena de texto' })
  @MaxLength(200, { message: 'NombreEquipo no puede exceder 200 caracteres' })
  nombreEquipo?: string;

  @IsOptional()
  @IsEnum(EstadoEquipoEnum, { message: 'Estado inválido' })
  estado?: EstadoEquipoEnum;
}
