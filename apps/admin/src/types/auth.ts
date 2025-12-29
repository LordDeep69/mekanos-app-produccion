/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos de Autenticación
 */

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  estado: boolean;
  created_at: string;
  updated_at: string;
}

export type RolUsuario = 
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'TECNICO'
  | 'OPERADOR';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: Usuario;
}

export interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
