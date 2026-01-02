/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TIPOS FRONTEND: Gestión Unificada de Usuarios
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tipos TypeScript sincronizados con el backend NestJS.
 * Estos tipos representan los DTOs del endpoint /usuarios/gestion-completa
 * 
 * @author GitHub Copilot (Claude Opus 4.5)
 * @date 2025-12-23
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMERADOS
// ═══════════════════════════════════════════════════════════════════════════════

export enum TipoIdentificacionEnum {
  CC = 'CC',           // Cédula de Ciudadanía
  NIT = 'NIT',         // Número Identificación Tributaria
  CE = 'CE',           // Cédula Extranjería
  PA = 'PA',           // Pasaporte
  TI = 'TI',           // Tarjeta Identidad
  RC = 'RC',           // Registro Civil
  DNI = 'DNI',         // Documento Nacional
}

export enum TipoPersonaEnum {
  NATURAL = 'NATURAL',
  JURIDICA = 'JURIDICA',
}

export enum EstadoUsuarioEnum {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  BLOQUEADO = 'BLOQUEADO',
  PENDIENTE_ACTIVACION = 'PENDIENTE_ACTIVACION',
}

export enum CargoEmpleadoEnum {
  GERENTE_GENERAL = 'GERENTE_GENERAL',
  GERENTE_OPERACIONES = 'GERENTE_OPERACIONES',
  GERENTE_COMERCIAL = 'GERENTE_COMERCIAL',
  ADMINISTRADOR = 'ADMINISTRADOR',
  SUPERVISOR_TECNICO = 'SUPERVISOR_TECNICO',
  ASESOR_COMERCIAL = 'ASESOR_COMERCIAL',
  ASESOR_TECNICO = 'ASESOR_TECNICO',
  COORDINADOR_LOGISTICA = 'COORDINADOR_LOGISTICA',
  TECNICO_SENIOR = 'TECNICO_SENIOR',
  TECNICO_JUNIOR = 'TECNICO_JUNIOR',
  AUXILIAR_ADMINISTRATIVO = 'AUXILIAR_ADMINISTRATIVO',
  AUXILIAR_TECNICO = 'AUXILIAR_TECNICO',
  PRACTICANTE = 'PRACTICANTE',
  CONDUCTOR = 'CONDUCTOR',
  OTRO = 'OTRO',
}

export enum TipoContratoEmpleadoEnum {
  INDEFINIDO = 'INDEFINIDO',
  TERMINO_FIJO = 'TERMINO_FIJO',
  PRESTACION_SERVICIOS = 'PRESTACION_SERVICIOS',
  APRENDIZAJE = 'APRENDIZAJE',
  PRACTICAS = 'PRACTICAS',
  OBRA_LABOR = 'OBRA_LABOR',
}

export enum NivelAcademicoEnum {
  PRIMARIA = 'PRIMARIA',
  BACHILLERATO = 'BACHILLERATO',
  TECNICO = 'TECNICO',
  TECNOLOGO = 'TECNOLOGO',
  PROFESIONAL = 'PROFESIONAL',
  ESPECIALIZACION = 'ESPECIALIZACION',
  MAESTRIA = 'MAESTRIA',
  DOCTORADO = 'DOCTORADO',
  NINGUNO = 'NINGUNO',
  OTRO = 'OTRO',
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES PARA DATOS ANIDADOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Datos de persona para crear/reutilizar
 */
export interface DatosPersona {
  // Identificación
  tipo_identificacion: TipoIdentificacionEnum;
  numero_identificacion: string;
  tipo_persona: TipoPersonaEnum;
  
  // Nombre (persona natural)
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  
  // Razón social (persona jurídica)
  razon_social?: string;
  nombre_comercial?: string;
  representante_legal?: string;
  cedula_representante?: string;
  
  // Contacto
  email_principal?: string;
  telefono_principal?: string;
  telefono_secundario?: string;
  celular?: string;
  
  // Ubicación
  direccion_principal?: string;
  barrio_zona?: string;
  ciudad?: string;
  departamento?: string;
  pais?: string;
  
  // Adicionales
  fecha_nacimiento?: string;
  observaciones?: string;
}

/**
 * Datos de usuario (credenciales)
 */
export interface DatosUsuario {
  username: string;
  email?: string;
  password?: string;
  debe_cambiar_password?: boolean;
  estado?: EstadoUsuarioEnum;
  enviar_email_bienvenida?: boolean;
}

/**
 * Datos de empleado (opcional)
 */
export interface DatosEmpleado {
  cargo: CargoEmpleadoEnum;
  descripcion_cargo?: string;
  fecha_ingreso: string;
  tipo_contrato?: TipoContratoEmpleadoEnum;
  departamento?: string;
  jefe_inmediato?: number;
  
  // Emergencia
  contacto_emergencia: string;
  telefono_emergencia: string;
  
  // Formación
  nivel_academico?: NivelAcademicoEnum;
  titulo_obtenido?: string;
  institucion_educativa?: string;
  
  // Roles operativos
  es_tecnico?: boolean;
  es_asesor?: boolean;
  
  // Licencia
  puede_conducir?: boolean;
  licencia_conduccion?: string;
  fecha_vencimiento_licencia?: string;
  
  observaciones?: string;
  habilidades_especiales?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Payload para crear un usuario completo
 * POST /usuarios/gestion-completa
 */
export interface CreateUsuarioCompletoPayload {
  datosPersona: DatosPersona;
  datosUsuario: DatosUsuario;
  datosEmpleado?: DatosEmpleado;
  rolesIds?: number[];
  id_persona_existente?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPUESTAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rol asignado al usuario
 */
export interface RolAsignado {
  id_rol: number;
  codigo_rol: string;
  nombre_rol: string;
}

/**
 * Información de persona en la respuesta
 */
export interface PersonaInfo {
  nombre_completo: string;
  tipo_identificacion: string;
  numero_identificacion: string;
}

/**
 * Respuesta del endpoint gestion-completa
 */
export interface UsuarioCompletoResponse {
  success: boolean;
  message: string;
  data: {
    id_usuario: number;
    id_persona: number;
    id_empleado?: number;
    username: string;
    email: string;
    estado: string;
    roles: RolAsignado[];
    persona: PersonaInfo;
    password_temporal?: string;
    persona_reutilizada: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BÚSQUEDA DE PERSONA
// ═══════════════════════════════════════════════════════════════════════════════

export interface BuscarPersonaPayload {
  numero_identificacion?: string;
  email?: string;
  query?: string;
}

export interface PersonaExistenteResponse {
  existe: boolean;
  tiene_usuario: boolean;
  tiene_empleado: boolean;
  es_cliente: boolean;
  es_proveedor: boolean;
  persona?: {
    id_persona: number;
    nombre_completo: string;
    tipo_identificacion: string;
    numero_identificacion: string;
    email_principal: string;
    tipo_persona: string;
  };
  usuario?: {
    id_usuario: number;
    username: string;
    email: string;
    estado: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTADO DE USUARIOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsuarioListItem {
  id_usuario: number;
  username: string;
  email: string;
  estado: string;
  ultimo_login: string | null;
  fecha_creacion: string;
  persona: {
    id_persona: number;
    nombre_completo: string;
    tipo_identificacion: string;
    numero_identificacion: string;
    tipo_persona: string;
    email_principal: string;
    telefono: string | null;
  };
  roles: RolAsignado[];
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

// ═══════════════════════════════════════════════════════════════════════════════
// ROLES DISPONIBLES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RolDisponible {
  id_rol: number;
  codigo_rol: string;
  nombre_rol: string;
  descripcion_rol: string;
  permite_acceso_web: boolean;
  permite_acceso_movil: boolean;
  permite_acceso_portal: boolean;
  estado_rol: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES PARA UI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Opciones para selects de tipo de identificación
 */
export const TIPO_IDENTIFICACION_OPTIONS = [
  { value: TipoIdentificacionEnum.CC, label: 'Cédula de Ciudadanía' },
  { value: TipoIdentificacionEnum.NIT, label: 'NIT' },
  { value: TipoIdentificacionEnum.CE, label: 'Cédula de Extranjería' },
  { value: TipoIdentificacionEnum.PA, label: 'Pasaporte' },
  { value: TipoIdentificacionEnum.TI, label: 'Tarjeta de Identidad' },
  { value: TipoIdentificacionEnum.RC, label: 'Registro Civil' },
  { value: TipoIdentificacionEnum.DNI, label: 'DNI' },
];

/**
 * Opciones para selects de cargo empleado
 */
export const CARGO_EMPLEADO_OPTIONS = [
  { value: CargoEmpleadoEnum.GERENTE_GENERAL, label: 'Gerente General' },
  { value: CargoEmpleadoEnum.GERENTE_OPERACIONES, label: 'Gerente de Operaciones' },
  { value: CargoEmpleadoEnum.GERENTE_COMERCIAL, label: 'Gerente Comercial' },
  { value: CargoEmpleadoEnum.ADMINISTRADOR, label: 'Administrador' },
  { value: CargoEmpleadoEnum.SUPERVISOR_TECNICO, label: 'Supervisor Técnico' },
  { value: CargoEmpleadoEnum.ASESOR_COMERCIAL, label: 'Asesor Comercial' },
  { value: CargoEmpleadoEnum.ASESOR_TECNICO, label: 'Asesor Técnico' },
  { value: CargoEmpleadoEnum.COORDINADOR_LOGISTICA, label: 'Coordinador Logística' },
  { value: CargoEmpleadoEnum.TECNICO_SENIOR, label: 'Técnico Senior' },
  { value: CargoEmpleadoEnum.TECNICO_JUNIOR, label: 'Técnico Junior' },
  { value: CargoEmpleadoEnum.AUXILIAR_ADMINISTRATIVO, label: 'Auxiliar Administrativo' },
  { value: CargoEmpleadoEnum.AUXILIAR_TECNICO, label: 'Auxiliar Técnico' },
  { value: CargoEmpleadoEnum.PRACTICANTE, label: 'Practicante' },
  { value: CargoEmpleadoEnum.CONDUCTOR, label: 'Conductor' },
  { value: CargoEmpleadoEnum.OTRO, label: 'Otro' },
];

/**
 * Opciones para selects de estado usuario
 */
export const ESTADO_USUARIO_OPTIONS = [
  { value: EstadoUsuarioEnum.ACTIVO, label: 'Activo', color: 'green' },
  { value: EstadoUsuarioEnum.INACTIVO, label: 'Inactivo', color: 'gray' },
  { value: EstadoUsuarioEnum.SUSPENDIDO, label: 'Suspendido', color: 'yellow' },
  { value: EstadoUsuarioEnum.BLOQUEADO, label: 'Bloqueado', color: 'red' },
  { value: EstadoUsuarioEnum.PENDIENTE_ACTIVACION, label: 'Pendiente Activación', color: 'blue' },
];

/**
 * Opciones para selects de nivel académico
 */
export const NIVEL_ACADEMICO_OPTIONS = [
  { value: NivelAcademicoEnum.NINGUNO, label: 'Ninguno' },
  { value: NivelAcademicoEnum.PRIMARIA, label: 'Primaria' },
  { value: NivelAcademicoEnum.BACHILLERATO, label: 'Bachillerato' },
  { value: NivelAcademicoEnum.TECNICO, label: 'Técnico' },
  { value: NivelAcademicoEnum.TECNOLOGO, label: 'Tecnólogo' },
  { value: NivelAcademicoEnum.PROFESIONAL, label: 'Profesional' },
  { value: NivelAcademicoEnum.ESPECIALIZACION, label: 'Especialización' },
  { value: NivelAcademicoEnum.MAESTRIA, label: 'Maestría' },
  { value: NivelAcademicoEnum.DOCTORADO, label: 'Doctorado' },
  { value: NivelAcademicoEnum.OTRO, label: 'Otro' },
];

/**
 * Opciones para selects de tipo contrato
 */
export const TIPO_CONTRATO_OPTIONS = [
  { value: TipoContratoEmpleadoEnum.INDEFINIDO, label: 'Indefinido' },
  { value: TipoContratoEmpleadoEnum.TERMINO_FIJO, label: 'Término Fijo' },
  { value: TipoContratoEmpleadoEnum.PRESTACION_SERVICIOS, label: 'Prestación de Servicios' },
  { value: TipoContratoEmpleadoEnum.APRENDIZAJE, label: 'Aprendizaje' },
  { value: TipoContratoEmpleadoEnum.PRACTICAS, label: 'Prácticas' },
  { value: TipoContratoEmpleadoEnum.OBRA_LABOR, label: 'Obra o Labor' },
];
