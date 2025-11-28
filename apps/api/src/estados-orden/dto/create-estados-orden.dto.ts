import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

/**
 * DTO para crear estado de orden
 * 
 * CAMPOS (12 totales):
 * - codigo_estado (UNIQUE, normalizado UPPER en handler)
 * - nombre_estado (requerido, 3-100 chars)
 * - descripcion (opcional, texto libre)
 * - permite_edicion (opcional, default true)
 * - permite_eliminacion (opcional, default false)
 * - es_estado_final (opcional, default false)
 * - color_hex (opcional, formato #RRGGBB)
 * - icono (opcional, 50 chars max)
 * - orden_visualizacion (opcional, > 0)
 * - activo (opcional, default true)
 */
export class CrearEstadosOrdenDto {
  @IsString({ message: 'codigo_estado debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'codigo_estado es requerido' })
  @MinLength(3, { message: 'codigo_estado debe tener al menos 3 caracteres' })
  @MaxLength(30, { message: 'codigo_estado debe tener máximo 30 caracteres' })
  codigoEstado: string;

  @IsString({ message: 'nombre_estado debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nombre_estado es requerido' })
  @MinLength(3, { message: 'nombre_estado debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'nombre_estado debe tener máximo 100 caracteres' })
  nombreEstado: string;

  @IsOptional()
  @IsString({ message: 'descripcion debe ser una cadena de texto' })
  descripcion?: string;

  @IsOptional()
  @IsBoolean({ message: 'permite_edicion debe ser un booleano' })
  permiteEdicion?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'permite_eliminacion debe ser un booleano' })
  permiteEliminacion?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'es_estado_final debe ser un booleano' })
  esEstadoFinal?: boolean;

  @IsOptional()
  @IsString({ message: 'color_hex debe ser una cadena de texto' })
  @MaxLength(7, { message: 'color_hex debe tener máximo 7 caracteres' })
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color_hex debe tener formato #RRGGBB (ej: #3B82F6)',
  })
  colorHex?: string;

  @IsOptional()
  @IsString({ message: 'icono debe ser una cadena de texto' })
  @MaxLength(50, { message: 'icono debe tener máximo 50 caracteres' })
  icono?: string;

  @IsOptional()
  @IsInt({ message: 'orden_visualizacion debe ser un número entero' })
  @Min(1, { message: 'orden_visualizacion debe ser mayor que 0' })
  ordenVisualizacion?: number;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser un booleano' })
  activo?: boolean;
}
