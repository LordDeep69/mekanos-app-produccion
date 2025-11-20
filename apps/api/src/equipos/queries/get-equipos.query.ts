import { IsOptional, IsInt, IsString, IsBoolean, Min } from 'class-validator';

/**
 * DTO para filtrar equipos en listados
 * ✅ FASE 2: Campos mapeados a schema real (snake_case)
 */
export class GetEquiposQueryDto {
  @IsOptional()
  @IsInt({ message: 'id_cliente debe ser un número entero' })
  id_cliente?: number;

  @IsOptional()
  @IsInt({ message: 'id_sede debe ser un número entero' })
  id_sede?: number;

  @IsOptional()
  @IsString({ message: 'estado_equipo debe ser una cadena de texto' })
  estado_equipo?: string;

  @IsOptional()
  @IsInt({ message: 'id_tipo_equipo debe ser un número entero' })
  id_tipo_equipo?: number;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser boolean' })
  activo?: boolean;

  @IsOptional()
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page?: number;

  @IsOptional()
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  limit?: number;
}

/**
 * Query para obtener lista de equipos con filtros
 * ✅ FASE 2: Campos snake_case
 */
export class GetEquiposQuery {
  constructor(
    public readonly id_cliente?: number,
    public readonly id_sede?: number,
    public readonly estado_equipo?: string,
    public readonly id_tipo_equipo?: number,
    public readonly activo?: boolean,
    public readonly page?: number,
    public readonly limit?: number
  ) {}
}
