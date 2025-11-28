import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

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

export class CreateEmpleadosDto {
  @IsInt()
  id_persona: number;

  @IsEnum(CargoEmpleadoEnum)
  cargo: CargoEmpleadoEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion_cargo?: string;

  @IsDateString()
  fecha_ingreso: string;

  @IsOptional()
  @IsDateString()
  fecha_retiro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo_retiro?: string;

  @IsOptional()
  @IsEnum(TipoContratoEmpleadoEnum)
  tipo_contrato?: TipoContratoEmpleadoEnum = TipoContratoEmpleadoEnum.INDEFINIDO;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @IsOptional()
  @IsInt()
  jefe_inmediato?: number;

  @IsString()
  @MaxLength(200)
  contacto_emergencia: string;

  @IsString()
  @MaxLength(20)
  telefono_emergencia: string;

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

  @IsOptional()
  @IsBoolean()
  es_tecnico?: boolean = false;

  @IsOptional()
  @IsBoolean()
  es_asesor?: boolean = false;

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
  @IsBoolean()
  empleado_activo?: boolean = true;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  habilidades_especiales?: string;
}
