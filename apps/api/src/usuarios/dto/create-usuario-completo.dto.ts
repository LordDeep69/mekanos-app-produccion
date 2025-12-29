/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DTO: CreateUsuarioCompletoDto - GESTIÓN UNIFICADA DE USUARIOS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este DTO implementa el patrón FACADE para la creación unificada de usuarios.
 * Permite crear en UNA SOLA TRANSACCIÓN:
 *   - Persona (si no existe)
 *   - Usuario (credenciales)
 *   - Empleado (opcional, si tiene cargo)
 *   - Asignación de Roles (N:N)
 * 
 * PRINCIPIO: El frontend envía UN solo paquete de datos.
 *            El backend orquesta la complejidad internamente.
 * 
 * @author GitHub Copilot (Claude Opus 4.5)
 * @date 2025-12-23
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEmail,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMERADOS (Sincronizados con Prisma/PostgreSQL)
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
// DTO ANIDADO: DATOS DE PERSONA
// ═══════════════════════════════════════════════════════════════════════════════

export class DatosPersonaDto {
  // ─────────────────────────────────────────────────────────────────────────────
  // IDENTIFICACIÓN (Obligatorio)
  // ─────────────────────────────────────────────────────────────────────────────
  
  @IsEnum(TipoIdentificacionEnum, { 
    message: 'tipo_identificacion debe ser CC, NIT, CE, PA, TI, RC o DNI' 
  })
  tipo_identificacion: TipoIdentificacionEnum;

  @IsString()
  @MinLength(5, { message: 'numero_identificacion debe tener al menos 5 caracteres' })
  @MaxLength(20, { message: 'numero_identificacion no puede exceder 20 caracteres' })
  numero_identificacion: string;

  @IsEnum(TipoPersonaEnum, { 
    message: 'tipo_persona debe ser NATURAL o JURIDICA' 
  })
  tipo_persona: TipoPersonaEnum;

  // ─────────────────────────────────────────────────────────────────────────────
  // NOMBRE PERSONA NATURAL (Condicional)
  // ─────────────────────────────────────────────────────────────────────────────

  @IsOptional()
  @IsString()
  @MaxLength(50)
  primer_nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  segundo_nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  primer_apellido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  segundo_apellido?: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // RAZÓN SOCIAL PERSONA JURÍDICA (Condicional)
  // ─────────────────────────────────────────────────────────────────────────────

  @IsOptional()
  @IsString()
  @MaxLength(200)
  razon_social?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre_comercial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  representante_legal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cedula_representante?: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTACTO
  // ─────────────────────────────────────────────────────────────────────────────

  @IsOptional()
  @IsEmail({}, { message: 'email_principal debe ser un email válido' })
  @MaxLength(150)
  email_principal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono_principal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono_secundario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  celular?: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // UBICACIÓN
  // ─────────────────────────────────────────────────────────────────────────────

  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion_principal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barrio_zona?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string = 'CARTAGENA';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string = 'BOLÍVAR';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pais?: string = 'COLOMBIA';

  // ─────────────────────────────────────────────────────────────────────────────
  // DATOS ADICIONALES
  // ─────────────────────────────────────────────────────────────────────────────

  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTO ANIDADO: DATOS DE USUARIO (Credenciales)
// ═══════════════════════════════════════════════════════════════════════════════

export class DatosUsuarioDto {
  @IsString()
  @MinLength(3, { message: 'username debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'username no puede exceder 50 caracteres' })
  username: string;

  @IsOptional()
  @IsEmail({}, { message: 'email debe ser un email válido' })
  @MaxLength(255)
  email?: string; // Si no viene, usa email_principal de persona

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'password debe tener al menos 8 caracteres' })
  @MaxLength(255)
  password?: string; // Si no viene, se genera automáticamente

  @IsOptional()
  @IsBoolean()
  debe_cambiar_password?: boolean = true;

  @IsOptional()
  @IsEnum(EstadoUsuarioEnum)
  estado?: EstadoUsuarioEnum = EstadoUsuarioEnum.PENDIENTE_ACTIVACION;

  @IsOptional()
  @IsBoolean()
  enviar_email_bienvenida?: boolean = true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTO ANIDADO: DATOS DE EMPLEADO (Opcional)
// ═══════════════════════════════════════════════════════════════════════════════

export class DatosEmpleadoDto {
  @IsEnum(CargoEmpleadoEnum, { message: 'cargo debe ser un cargo válido' })
  cargo: CargoEmpleadoEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion_cargo?: string;

  @IsDateString({}, { message: 'fecha_ingreso debe ser una fecha válida' })
  fecha_ingreso: string;

  @IsOptional()
  @IsEnum(TipoContratoEmpleadoEnum)
  tipo_contrato?: TipoContratoEmpleadoEnum = TipoContratoEmpleadoEnum.INDEFINIDO;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @IsOptional()
  @IsInt()
  jefe_inmediato?: number; // ID del empleado jefe

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTACTO EMERGENCIA (Obligatorio para empleados)
  // ─────────────────────────────────────────────────────────────────────────────

  @IsString()
  @MaxLength(200)
  contacto_emergencia: string;

  @IsString()
  @MaxLength(20)
  telefono_emergencia: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // FORMACIÓN ACADÉMICA
  // ─────────────────────────────────────────────────────────────────────────────

  @IsOptional()
  @IsEnum(NivelAcademicoEnum)
  nivel_academico?: NivelAcademicoEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo_obtenido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  institucion_educativa?: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // ROLES OPERATIVOS
  // ─────────────────────────────────────────────────────────────────────────────

  @IsOptional()
  @IsBoolean()
  es_tecnico?: boolean = false;

  @IsOptional()
  @IsBoolean()
  es_asesor?: boolean = false;

  // ─────────────────────────────────────────────────────────────────────────────
  // LICENCIA CONDUCCIÓN
  // ─────────────────────────────────────────────────────────────────────────────

  @IsOptional()
  @IsBoolean()
  puede_conducir?: boolean = false;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  licencia_conduccion?: string;

  @IsOptional()
  @IsDateString()
  fecha_vencimiento_licencia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  habilidades_especiales?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTO PRINCIPAL: CREATE USUARIO COMPLETO
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateUsuarioCompletoDto {
  /**
   * Datos de la persona (identidad, contacto, ubicación)
   * Si la persona ya existe (por cédula/NIT), se reutiliza
   */
  @ValidateNested()
  @Type(() => DatosPersonaDto)
  datosPersona: DatosPersonaDto;

  /**
   * Datos del usuario (credenciales, estado)
   */
  @ValidateNested()
  @Type(() => DatosUsuarioDto)
  datosUsuario: DatosUsuarioDto;

  /**
   * Datos del empleado (opcional)
   * Si se incluye, crea registro en tabla empleados
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosEmpleadoDto)
  datosEmpleado?: DatosEmpleadoDto;

  /**
   * IDs de roles a asignar
   * Se insertan en tabla usuarios_roles
   */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true, message: 'Cada rol debe ser un ID entero' })
  rolesIds?: number[];

  /**
   * ID de persona existente (opcional)
   * Si viene, NO se crea persona nueva, se reutiliza
   */
  @IsOptional()
  @IsInt()
  id_persona_existente?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTO RESPUESTA
// ═══════════════════════════════════════════════════════════════════════════════

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
    roles: Array<{
      id_rol: number;
      codigo_rol: string;
      nombre_rol: string;
    }>;
    persona: {
      nombre_completo: string;
      tipo_identificacion: string;
      numero_identificacion: string;
    };
    password_temporal?: string; // Solo si se generó automáticamente
    persona_reutilizada: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTO PARA BÚSQUEDA DE PERSONA EXISTENTE
// ═══════════════════════════════════════════════════════════════════════════════

export class BuscarPersonaDto {
  @IsOptional()
  @IsString()
  numero_identificacion?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  query?: string; // Búsqueda libre por nombre/razón social
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
