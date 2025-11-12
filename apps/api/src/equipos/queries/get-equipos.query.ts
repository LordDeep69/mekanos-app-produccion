import { IsOptional, IsInt, IsString, Min } from 'class-validator';

/**
 * DTO para filtrar equipos en listados
 */
export class GetEquiposQueryDto {
  @IsOptional()
  @IsInt({ message: 'ClienteId debe ser un número entero' })
  clienteId?: number;

  @IsOptional()
  @IsInt({ message: 'SedeId debe ser un número entero' })
  sedeId?: number;

  @IsOptional()
  @IsString({ message: 'Estado debe ser una cadena de texto' })
  estado?: string;

  @IsOptional()
  @IsInt({ message: 'TipoEquipoId debe ser un número entero' })
  tipoEquipoId?: number;

  @IsOptional()
  @IsInt({ message: 'Page debe ser un número entero' })
  @Min(1, { message: 'Page debe ser mayor o igual a 1' })
  page?: number;

  @IsOptional()
  @IsInt({ message: 'Limit debe ser un número entero' })
  @Min(1, { message: 'Limit debe ser mayor o igual a 1' })
  limit?: number;
}

/**
 * Query para obtener lista de equipos con filtros
 */
export class GetEquiposQuery {
  constructor(
    public readonly clienteId?: number,
    public readonly sedeId?: number,
    public readonly estado?: string,
    public readonly tipoEquipoId?: number,
    public readonly page?: number,
    public readonly limit?: number
  ) {}
}
