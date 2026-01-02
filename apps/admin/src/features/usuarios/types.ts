/**
 * TIPOS DE USUARIOS - MEKANOS S.A.S
 * 
 * Tipos TypeScript para el módulo de gestión de usuarios.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type TipoIdentificacion = 'CC' | 'NIT' | 'CE' | 'PA' | 'TI' | 'RC' | 'DNI';
export type TipoPersona = 'NATURAL' | 'JURIDICA';
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'BLOQUEADO' | 'PENDIENTE_ACTIVACION';
export type CargoEmpleado = 
  | 'GERENTE_GENERAL' | 'GERENTE_OPERACIONES' | 'GERENTE_COMERCIAL'
  | 'ADMINISTRADOR' | 'SUPERVISOR_TECNICO' | 'ASESOR_COMERCIAL' | 'ASESOR_TECNICO'
  | 'COORDINADOR_LOGISTICA' | 'TECNICO_SENIOR' | 'TECNICO_JUNIOR'
  | 'AUXILIAR_ADMINISTRATIVO' | 'AUXILIAR_TECNICO' | 'PRACTICANTE' | 'CONDUCTOR' | 'OTRO';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES PRINCIPALES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Rol {
  id_rol: number;
  codigo_rol: string;
  nombre_rol: string;
  descripcion: string | null;
  color_hex: string | null;
  icono: string | null;
  permite_acceso_web: boolean;
  permite_acceso_movil: boolean;
  activo: boolean;
}

export interface PersonaResumen {
  id_persona: number;
  nombre_completo: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  email_principal: string | null;
  tipo_persona: string;
  telefono?: string | null;
}

export interface UsuarioListItem {
  id_usuario: number;
  username: string;
  email: string;
  estado: EstadoUsuario | null;
  ultima_sesion: string | null;
  fecha_creacion: string | null;
  persona: PersonaResumen;
  roles: Array<{
    id_rol: number;
    codigo_rol: string;
    nombre_rol: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs PARA CREAR USUARIO
// ═══════════════════════════════════════════════════════════════════════════════

export interface DatosPersonaInput {
  tipo_identificacion: TipoIdentificacion;
  numero_identificacion: string;
  tipo_persona: TipoPersona;
  // Persona natural
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  // Persona jurídica
  razon_social?: string;
  nombre_comercial?: string;
  representante_legal?: string;
  // Contacto
  email_principal?: string;
  telefono_principal?: string;
  celular?: string;
  // Ubicación
  direccion_principal?: string;
  ciudad?: string;
  departamento?: string;
}

export interface DatosUsuarioInput {
  username: string;
  email?: string;
  password?: string;
  confirmar_password?: string;
  debe_cambiar_password?: boolean;
  estado?: EstadoUsuario;
}

export interface DatosEmpleadoInput {
  cargo: CargoEmpleado;
  descripcion_cargo?: string;
  fecha_ingreso: string;
  tipo_contrato?: string;
  departamento?: string;
  contacto_emergencia: string;
  telefono_emergencia: string;
  nivel_academico?: string;
  titulo_obtenido?: string;
  es_tecnico?: boolean;
  es_asesor?: boolean;
}

export interface CreateUsuarioPayload {
  datosPersona: DatosPersonaInput;
  datosUsuario: DatosUsuarioInput;
  datosEmpleado?: DatosEmpleadoInput;
  rolesIds?: number[];
  id_persona_existente?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPUESTAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateUsuarioResponse {
  success: boolean;
  message: string;
  data: {
    id_usuario: number;
    id_persona: number;
    id_empleado?: number;
    username: string;
    email: string;
    estado: string;
    roles: Array<{ id_rol: number; codigo_rol: string; nombre_rol: string }>;
    persona: { nombre_completo: string; tipo_identificacion: string; numero_identificacion: string };
    password_temporal?: string;
    persona_reutilizada: boolean;
  };
}

export interface UsuariosListadoResponse {
  data: UsuarioListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BuscarPersonaResponse {
  existe: boolean;
  tiene_usuario: boolean;
  tiene_empleado: boolean;
  persona?: PersonaResumen;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPCIONES PARA SELECTS
// ═══════════════════════════════════════════════════════════════════════════════

export const TIPO_IDENTIFICACION_OPTIONS = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
];

export const CARGO_OPTIONS = [
  { value: 'GERENTE_GENERAL', label: 'Gerente General' },
  { value: 'GERENTE_OPERACIONES', label: 'Gerente de Operaciones' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'SUPERVISOR_TECNICO', label: 'Supervisor Técnico' },
  { value: 'ASESOR_COMERCIAL', label: 'Asesor Comercial' },
  { value: 'TECNICO_SENIOR', label: 'Técnico Senior' },
  { value: 'TECNICO_JUNIOR', label: 'Técnico Junior' },
  { value: 'AUXILIAR_ADMINISTRATIVO', label: 'Auxiliar Administrativo' },
  { value: 'PRACTICANTE', label: 'Practicante' },
  { value: 'CONDUCTOR', label: 'Conductor' },
];

export const ESTADO_USUARIO_OPTIONS = [
  { value: 'ACTIVO', label: 'Activo', color: 'bg-green-500' },
  { value: 'INACTIVO', label: 'Inactivo', color: 'bg-gray-500' },
  { value: 'SUSPENDIDO', label: 'Suspendido', color: 'bg-yellow-500' },
  { value: 'BLOQUEADO', label: 'Bloqueado', color: 'bg-red-500' },
  { value: 'PENDIENTE_ACTIVACION', label: 'Pendiente', color: 'bg-blue-500' },
];
