import { IsInt } from 'class-validator';

/**
 * DTO para asignar rol a usuario
 * ✅ FASE 2: RBAC Core - Junction table
 * 📋 Schema: schema.prisma lines 2164-2180
 * 🔑 PK Compuesta: (id_usuario, id_rol)
 */
export class AsignarRolDto {
  @IsInt({ message: 'id_usuario debe ser entero' })
  id_usuario!: number;

  @IsInt({ message: 'id_rol debe ser entero' })
  id_rol!: number;
}
