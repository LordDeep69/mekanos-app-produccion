/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos para el módulo de Empleados/Técnicos
 * 
 * Backend: empleados.controller.ts
 */

// Persona asociada al empleado (COMPLETO según SQL)
export interface PersonaEmpleado {
  id_persona: number;
  tipo_identificacion?: string;
  numero_identificacion?: string;
  tipo_persona?: string;
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  nombre_completo?: string;
  razon_social?: string;
  nombre_comercial?: string;
  representante_legal?: string;
  cedula_representante?: string;
  email_principal?: string;
  telefono_principal?: string;
  telefono_secundario?: string;
  celular?: string;
  direccion_principal?: string;
  barrio_zona?: string;
  ciudad?: string;
  departamento?: string;
  pais?: string;
  fecha_nacimiento?: string;
  es_cliente?: boolean;
  es_proveedor?: boolean;
  es_empleado?: boolean;
  es_contratista?: boolean;
  ruta_foto?: string;
  observaciones?: string;
  activo?: boolean;
  fecha_creacion?: string;
}

// Empleado base (COMPLETO según SQL)
export interface Empleado {
  id_empleado: number;
  id_persona: number;
  codigo_empleado?: string;
  cargo?: string;
  descripcion_cargo?: string;
  fecha_ingreso?: string;
  fecha_retiro?: string;
  motivo_retiro?: string;
  tipo_contrato?: string;
  departamento?: string;
  jefe_inmediato?: number;
  contacto_emergencia?: string;
  telefono_emergencia?: string;
  nivel_academico?: string;
  titulo_obtenido?: string;
  institucion_educativa?: string;
  es_tecnico: boolean;
  es_asesor: boolean;
  puede_conducir?: boolean;
  licencia_conduccion?: string;
  fecha_vencimiento_licencia?: string;
  empleado_activo: boolean;
  observaciones?: string;
  habilidades_especiales?: string;
  creado_por?: number;
  fecha_creacion?: string;
  modificado_por?: number;
  fecha_modificacion?: string;
  persona?: PersonaEmpleado;
}

// Empleado con datos de persona incluidos
export interface EmpleadoConPersona extends Empleado {
  persona: PersonaEmpleado;
}

// Parámetros de consulta
export interface EmpleadosQueryParams {
  es_tecnico?: boolean;
  es_asesor?: boolean;
  empleado_activo?: boolean;
  skip?: number;
  take?: number;
  search?: string;
}

// Respuesta paginada
export interface EmpleadosResponse {
  data: EmpleadoConPersona[];
  total: number;
}

// DTO para crear empleado
export interface CreateEmpleadoDto {
  id_persona: number;
  codigo_empleado?: string;
  cargo?: string;
  es_tecnico?: boolean;
  es_asesor?: boolean;
  empleado_activo?: boolean;
  fecha_ingreso?: string;
  observaciones?: string;
}

// DTO para actualizar empleado
export interface UpdateEmpleadoDto {
  codigo_empleado?: string;
  cargo?: string;
  es_tecnico?: boolean;
  es_asesor?: boolean;
  empleado_activo?: boolean;
  fecha_ingreso?: string;
  fecha_retiro?: string;
  observaciones?: string;
}

// Tipo para rol del empleado (visual)
export type RolEmpleado = 'TECNICO' | 'ASESOR' | 'ADMINISTRATIVO';

// Helper para obtener nombre completo
export function getNombreCompleto(persona?: PersonaEmpleado): string {
  if (!persona) return 'Sin nombre';

  if (persona.razon_social) {
    return persona.razon_social;
  }

  const partes = [
    persona.primer_nombre,
    persona.segundo_nombre,
    persona.primer_apellido,
    persona.segundo_apellido,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(' ') : 'Sin nombre';
}

// Helper para obtener rol display
export function getRolDisplay(empleado: Empleado): string {
  const roles: string[] = [];
  if (empleado.es_tecnico) roles.push('Técnico');
  if (empleado.es_asesor) roles.push('Asesor');
  if (roles.length === 0) roles.push('Administrativo');
  return roles.join(' / ');
}
