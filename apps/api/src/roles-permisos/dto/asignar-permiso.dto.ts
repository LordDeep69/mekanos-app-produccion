import { IsInt } from 'class-validator';

/**
 * DTO para asignar permiso a rol
 * ✅ FASE 2: RBAC Core - Junction table
 * 📋 Schema: schema.prisma lines 2123-2136
 * 🔑 PK Compuesta: (id_rol, id_permiso)
 */
export class AsignarPermisoDto {
  @IsInt({ message: 'id_rol debe ser entero' })
  id_rol!: number;

  @IsInt({ message: 'id_permiso debe ser entero' })
  id_permiso!: number;
}
