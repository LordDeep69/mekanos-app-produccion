import {
    IsBoolean,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

/**
 * DTO para crear permisos
 * ✅ FASE 2: RBAC Core
 * 📋 Schema: schema.prisma lines 2078-2094
 * 🔑 Unique: codigo_permiso
 */
export class CreatePermisosDto {
  // 🔴 CAMPOS OBLIGATORIOS
  @IsString({ message: 'codigo_permiso debe ser texto' })
  @MaxLength(100, { message: 'codigo_permiso no puede exceder 100 caracteres' })
  codigo_permiso!: string;

  @IsString({ message: 'nombre_permiso debe ser texto' })
  @MaxLength(200, { message: 'nombre_permiso no puede exceder 200 caracteres' })
  nombre_permiso!: string;

  @IsString({ message: 'modulo debe ser texto' })
  @MaxLength(50, { message: 'modulo no puede exceder 50 caracteres' })
  modulo!: string;

  // 🟠 CAMPOS OPCIONALES
  @IsOptional()
  @IsString({ message: 'descripcion debe ser texto' })
  descripcion?: string;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser booleano' })
  activo?: boolean = true;

  @IsOptional()
  @IsString({ message: 'observaciones debe ser texto' })
  observaciones?: string;
}
