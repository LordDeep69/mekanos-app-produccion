/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos para módulo Clientes
 */

// ===== ENUMS =====

export enum TipoClienteEnum {
  RESIDENCIAL = 'RESIDENCIAL',
  COMERCIAL = 'COMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  HOSPITALARIO = 'HOSPITALARIO',
  EDUCATIVO = 'EDUCATIVO',
  GUBERNAMENTAL = 'GUBERNAMENTAL',
  HOTELERO = 'HOTELERO',
  EDIFICIO_RESIDENCIAL = 'EDIFICIO_RESIDENCIAL',
  OTRO = 'OTRO',
}

export enum PeriodicidadMantenimientoEnum {
  MENSUAL = 'MENSUAL',
  BIMESTRAL = 'BIMESTRAL',
  TRIMESTRAL = 'TRIMESTRAL',
  CUATRIMESTRAL = 'CUATRIMESTRAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL',
  POR_SOLICITUD = 'POR_SOLICITUD',
  SIN_DEFINIR = 'SIN_DEFINIR',
}

export enum TipoIdentificacionEnum {
  CC = 'CC',
  CE = 'CE',
  NIT = 'NIT',
  PASAPORTE = 'PASAPORTE',
  TI = 'TI',
  RC = 'RC',
}

export enum TipoPersonaEnum {
  NATURAL = 'NATURAL',
  JURIDICA = 'JURIDICA',
}

// ===== ENTIDADES =====

/**
 * Persona base (datos de identificación y contacto)
 */
export interface Persona {
  id_persona: number;
  tipo_identificacion: TipoIdentificacionEnum;
  numero_identificacion: string;
  tipo_persona: TipoPersonaEnum;
  primer_nombre?: string | null;
  segundo_nombre?: string | null;
  primer_apellido?: string | null;
  segundo_apellido?: string | null;
  nombre_completo?: string | null;
  razon_social?: string | null;
  nombre_comercial?: string | null;
  representante_legal?: string | null;
  cedula_representante?: string | null;
  email_principal?: string | null;
  telefono_principal?: string | null;
  telefono_secundario?: string | null;
  celular?: string | null;
  direccion_principal?: string | null;
  barrio_zona?: string | null;
  ciudad: string;
  departamento?: string | null;
  pais?: string | null;
  activo?: boolean;
}

/**
 * Cliente completo con relación a persona
 */
export interface Cliente {
  id_cliente: number;
  id_persona: number;
  codigo_cliente?: string | null;
  tipo_cliente: TipoClienteEnum;
  fecha_inicio_servicio?: string | null;
  periodicidad_mantenimiento?: PeriodicidadMantenimientoEnum | null;
  id_firma_administrativa?: number | null;
  id_asesor_asignado?: number | null;
  descuento_autorizado?: number | null;
  tiene_credito?: boolean | null;
  limite_credito?: number | null;
  dias_credito?: number | null;
  cliente_activo?: boolean | null;
  fecha_ultimo_servicio?: string | null;
  fecha_proximo_servicio?: string | null;
  tiene_acceso_portal?: boolean | null;
  fecha_activacion_portal?: string | null;
  observaciones_servicio?: string | null;
  requisitos_especiales?: string | null;
  creado_por?: number | null;
  fecha_creacion?: string | null;
  modificado_por?: number | null;
  fecha_modificacion?: string | null;
  // Relación incluida del backend
  persona?: Persona;
}

/**
 * Cliente con persona expandida (respuesta típica del backend)
 */
export interface ClienteConPersona extends Cliente {
  persona: Persona;
}

// ===== DTOs =====

/**
 * Parámetros de búsqueda para listado
 */
export interface ClientesQueryParams {
  tipo_cliente?: TipoClienteEnum;
  cliente_activo?: boolean;
  skip?: number;
  take?: number;
  search?: string;
}

/**
 * Respuesta paginada del backend
 */
export interface ClientesResponse {
  data: ClienteConPersona[];
  total: number;
  page?: number;
  limit?: number;
}

/**
 * DTO anidado para crear persona junto con cliente
 */
export interface CreatePersonaNestedDto {
  tipo_identificacion: TipoIdentificacionEnum;
  numero_identificacion: string;
  tipo_persona?: TipoPersonaEnum;
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  razon_social?: string;
  nombre_comercial?: string;
  representante_legal?: string;
  cedula_representante?: string;
  email_principal?: string;
  telefono_principal?: string;
  celular?: string;
  direccion_principal?: string;
  ciudad?: string;
  departamento?: string;
}

/**
 * DTO para crear cliente (con persona nueva o id_persona existente)
 */
export interface CreateClienteDto {
  // Opción 1: ID de persona existente
  id_persona?: number;
  // Opción 2: Datos de persona nueva
  persona?: CreatePersonaNestedDto;
  // Datos del cliente
  tipo_cliente?: TipoClienteEnum;
  periodicidad_mantenimiento?: PeriodicidadMantenimientoEnum;
  descuento_autorizado?: number;
  tiene_credito?: boolean;
  limite_credito?: number;
  dias_credito?: number;
  cliente_activo?: boolean;
  tiene_acceso_portal?: boolean;
  observaciones_servicio?: string;
  requisitos_especiales?: string;
}

/**
 * DTO para actualizar cliente
 */
export type UpdateClienteDto = Partial<Omit<CreateClienteDto, 'id_persona'>>;

/**
 * DTO para crear cliente con persona nueva (formulario combinado)
 */
export interface CreateClienteConPersonaDto {
  // Datos persona
  tipo_identificacion: TipoIdentificacionEnum;
  numero_identificacion: string;
  tipo_persona: TipoPersonaEnum;
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
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
  // Datos cliente
  tipo_cliente?: TipoClienteEnum;
  periodicidad_mantenimiento?: PeriodicidadMantenimientoEnum;
  descuento_autorizado?: number;
  tiene_credito?: boolean;
  limite_credito?: number;
  dias_credito?: number;
  observaciones_servicio?: string;
  requisitos_especiales?: string;
}

// ===== HELPERS =====

export const TIPO_CLIENTE_LABELS: Record<TipoClienteEnum, string> = {
  [TipoClienteEnum.RESIDENCIAL]: 'Residencial',
  [TipoClienteEnum.COMERCIAL]: 'Comercial',
  [TipoClienteEnum.INDUSTRIAL]: 'Industrial',
  [TipoClienteEnum.HOSPITALARIO]: 'Hospitalario',
  [TipoClienteEnum.EDUCATIVO]: 'Educativo',
  [TipoClienteEnum.GUBERNAMENTAL]: 'Gubernamental',
  [TipoClienteEnum.HOTELERO]: 'Hotelero',
  [TipoClienteEnum.EDIFICIO_RESIDENCIAL]: 'Edificio Residencial',
  [TipoClienteEnum.OTRO]: 'Otro',
};

export const PERIODICIDAD_LABELS: Record<PeriodicidadMantenimientoEnum, string> = {
  [PeriodicidadMantenimientoEnum.MENSUAL]: 'Mensual',
  [PeriodicidadMantenimientoEnum.BIMESTRAL]: 'Bimestral',
  [PeriodicidadMantenimientoEnum.TRIMESTRAL]: 'Trimestral',
  [PeriodicidadMantenimientoEnum.CUATRIMESTRAL]: 'Cuatrimestral',
  [PeriodicidadMantenimientoEnum.SEMESTRAL]: 'Semestral',
  [PeriodicidadMantenimientoEnum.ANUAL]: 'Anual',
  [PeriodicidadMantenimientoEnum.POR_SOLICITUD]: 'Por Solicitud',
  [PeriodicidadMantenimientoEnum.SIN_DEFINIR]: 'Sin Definir',
};
