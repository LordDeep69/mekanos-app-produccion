import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min
} from 'class-validator';

/**
 * DTO para crear roles
 * ✅ FASE 2: RBAC Core
 * 📋 Schema: schema.prisma lines 2096-2120
 * 🔑 Unique: codigo_rol
 */
export class CreateRolesDto {
  // 🔴 CAMPOS OBLIGATORIOS
  @IsString({ message: 'codigo_rol debe ser texto' })
  @MaxLength(50, { message: 'codigo_rol no puede exceder 50 caracteres' })
  codigo_rol!: string;

  @IsString({ message: 'nombre_rol debe ser texto' })
  @MaxLength(100, { message: 'nombre_rol no puede exceder 100 caracteres' })
  nombre_rol!: string;

  // 🟠 CAMPOS OPCIONALES
  @IsOptional()
  @IsString({ message: 'descripcion debe ser texto' })
  descripcion?: string;

  @IsOptional()
  @IsInt({ message: 'nivel_jerarquia debe ser entero' })
  @Min(0, { message: 'nivel_jerarquia debe ser mayor o igual a 0' })
  nivel_jerarquia?: number = 0;

  @IsOptional()
  @IsBoolean({ message: 'es_rol_sistema debe ser booleano' })
  es_rol_sistema?: boolean = false;

  @IsOptional()
  @IsString({ message: 'color_hex debe ser texto' })
  @MaxLength(7, { message: 'color_hex no puede exceder 7 caracteres' })
  color_hex?: string;

  @IsOptional()
  @IsString({ message: 'icono debe ser texto' })
  @MaxLength(50, { message: 'icono no puede exceder 50 caracteres' })
  icono?: string;

  @IsOptional()
  @IsBoolean({ message: 'permite_acceso_web debe ser booleano' })
  permite_acceso_web?: boolean = true;

  @IsOptional()
  @IsBoolean({ message: 'permite_acceso_movil debe ser booleano' })
  permite_acceso_movil?: boolean = false;

  @IsOptional()
  @IsBoolean({ message: 'permite_acceso_portal_cliente debe ser booleano' })
  permite_acceso_portal_cliente?: boolean = false;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser booleano' })
  activo?: boolean = true;

  @IsOptional()
  @IsString({ message: 'observaciones debe ser texto' })
  observaciones?: string;
}
