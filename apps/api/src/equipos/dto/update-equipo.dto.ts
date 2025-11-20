import { IsString, IsInt, IsOptional, IsEnum, Matches, MinLength, MaxLength } from 'class-validator';

/**
 * DTO para actualizar un equipo
 * ✅ FASE 2: Todos los campos opcionales, mapeados a schema real
 */
export class UpdateEquipoDto {
  @IsOptional()
  @IsString({ message: 'codigo_equipo debe ser una cadena de texto' })
  @MinLength(1, { message: 'codigo_equipo no puede estar vacío' })
  @MaxLength(30, { message: 'codigo_equipo no puede exceder 30 caracteres' })
  @Matches(/^[A-Z0-9\-]+$/, { 
    message: 'codigo_equipo debe contener solo letras mayúsculas, números y guiones' 
  })
  codigo_equipo?: string;

  @IsOptional()
  @IsInt({ message: 'id_cliente debe ser un número entero' })
  id_cliente?: number;

  @IsOptional()
  @IsInt({ message: 'id_tipo_equipo debe ser un número entero' })
  id_tipo_equipo?: number;

  @IsOptional()
  @IsString({ message: 'ubicacion_texto debe ser una cadena de texto' })
  @MinLength(5, { message: 'ubicacion_texto debe tener al menos 5 caracteres' })
  @MaxLength(500, { message: 'ubicacion_texto no puede exceder 500 caracteres' })
  ubicacion_texto?: string;

  @IsOptional()
  @IsInt({ message: 'id_sede debe ser un número entero' })
  id_sede?: number;

  @IsOptional()
  @IsString({ message: 'nombre_equipo debe ser una cadena de texto' })
  @MaxLength(200, { message: 'nombre_equipo no puede exceder 200 caracteres' })
  nombre_equipo?: string;

  @IsOptional()
  @IsString({ message: 'numero_serie_equipo debe ser una cadena de texto' })
  @MaxLength(100, { message: 'numero_serie_equipo no puede exceder 100 caracteres' })
  numero_serie_equipo?: string;

  @IsOptional()
  @IsEnum(['OPERATIVO', 'FUERA_DE_SERVICIO', 'EN_REPARACION', 'BAJA'], {
    message: 'estado_equipo debe ser un valor válido del enum'
  })
  estado_equipo?: string;

  @IsOptional()
  @IsEnum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA'], {
    message: 'criticidad debe ser un valor válido del enum'
  })
  criticidad?: string;

  // modificado_por se obtiene del JWT, no del body
}
