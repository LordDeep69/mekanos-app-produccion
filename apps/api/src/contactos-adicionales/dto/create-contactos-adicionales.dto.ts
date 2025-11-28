import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

/**
 * DTO para crear contactos adicionales
 * ✅ FASE 2: Contactos Module
 * 📋 Schema: schema.prisma lines 1908-1940
 * 🔑 FK: id_persona (personas)
 */
export class CreateContactosAdicionalesDto {
  // 🔴 CAMPOS OBLIGATORIOS
  @IsInt({ message: 'id_persona debe ser entero' })
  id_persona!: number;

  @IsString({ message: 'nombre_contacto debe ser texto' })
  @MaxLength(200, { message: 'nombre_contacto no puede exceder 200 caracteres' })
  nombre_contacto!: string;

  // 🟠 CAMPOS OPCIONALES
  @IsOptional()
  @IsString({ message: 'cargo debe ser texto' })
  @MaxLength(100, { message: 'cargo no puede exceder 100 caracteres' })
  cargo?: string;

  @IsOptional()
  @IsString({ message: 'telefono debe ser texto' })
  @MaxLength(20, { message: 'telefono no puede exceder 20 caracteres' })
  telefono?: string;

  @IsOptional()
  @IsString({ message: 'celular debe ser texto' })
  @MaxLength(20, { message: 'celular no puede exceder 20 caracteres' })
  celular?: string;

  @IsOptional()
  @IsString({ message: 'email debe ser texto' })
  @MaxLength(150, { message: 'email no puede exceder 150 caracteres' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'tipo_contacto debe ser texto' })
  tipo_contacto?: string;

  @IsOptional()
  @IsString({ message: 'responsabilidades debe ser texto' })
  responsabilidades?: string;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser booleano' })
  activo?: boolean = true;

  @IsOptional()
  @IsString({ message: 'observaciones debe ser texto' })
  observaciones?: string;
}
