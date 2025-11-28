import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
} from 'class-validator';

/**
 * DTO para crear firmas administrativas
 * ✅ FASE 2: Firmas Administrativas Module
 * 📋 Schema: schema.prisma lines 1968-2000
 * 🔑 Unique: id_persona
 */
export class CreateFirmasAdministrativasDto {
  // 🔴 CAMPOS OBLIGATORIOS
  @IsInt({ message: 'id_persona debe ser entero' })
  id_persona!: number;

  // 🟠 CAMPOS OPCIONALES
  @IsOptional()
  @IsBoolean({ message: 'firma_activa debe ser booleano' })
  firma_activa?: boolean = true;

  @IsOptional()
  @IsString({ message: 'observaciones debe ser texto' })
  observaciones?: string;

  @IsOptional()
  @IsString({ message: 'requisitos_operativos debe ser texto' })
  requisitos_operativos?: string;
}
