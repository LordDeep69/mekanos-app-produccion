export class AuthResponseDto {
  access_token!: string;
  refresh_token!: string;
  user!: {
    id: number;
    email: string;
    nombre: string;
    rol: string;
    roles?: string[];
    permisos?: string[];
    idEmpleado?: number; // ID del empleado para sincronización móvil
  };
}
