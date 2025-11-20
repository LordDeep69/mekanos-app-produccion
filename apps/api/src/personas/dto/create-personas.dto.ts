import { IsBoolean, IsDateString, IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO para crear personas
 * ✅ REFACTORIZADO FASE 2: Validaciones completas con class-validator
 * 📋 Schema: SUPABASE.MD lines 1302-1380
 * 🔑 Unique constraint: (tipo_identificacion, numero_identificacion)
 */
export class CreatePersonasDto {
  // 🔴 CAMPOS OBLIGATORIOS
  @IsEnum(['CC', 'NIT', 'CE', 'PA', 'TI', 'RC', 'DNI'], {
    message: 'tipo_identificacion debe ser un valor válido: CC, NIT, CE, PA, TI, RC, DNI'
  })
  tipo_identificacion!: 'CC' | 'NIT' | 'CE' | 'PA' | 'TI' | 'RC' | 'DNI';

  @IsString({ message: 'numero_identificacion debe ser texto' })
  @MaxLength(20, { message: 'numero_identificacion no puede exceder 20 caracteres' })
  numero_identificacion!: string;

  @IsEnum(['NATURAL', 'JURIDICA'], {
    message: 'tipo_persona debe ser: NATURAL o JURIDICA'
  })
  tipo_persona!: 'NATURAL' | 'JURIDICA';

  // 🟠 CAMPOS PARA PERSONA NATURAL
  @IsOptional()
  @IsString({ message: 'primer_nombre debe ser texto' })
  @MaxLength(50, { message: 'primer_nombre no puede exceder 50 caracteres' })
  primer_nombre?: string;

  @IsOptional()
  @IsString({ message: 'segundo_nombre debe ser texto' })
  @MaxLength(50, { message: 'segundo_nombre no puede exceder 50 caracteres' })
  segundo_nombre?: string;

  @IsOptional()
  @IsString({ message: 'primer_apellido debe ser texto' })
  @MaxLength(50, { message: 'primer_apellido no puede exceder 50 caracteres' })
  primer_apellido?: string;

  @IsOptional()
  @IsString({ message: 'segundo_apellido debe ser texto' })
  @MaxLength(50, { message: 'segundo_apellido no puede exceder 50 caracteres' })
  segundo_apellido?: string;

  // 🟠 CAMPOS PARA PERSONA JURIDICA
  @IsOptional()
  @IsString({ message: 'razon_social debe ser texto' })
  @MaxLength(200, { message: 'razon_social no puede exceder 200 caracteres' })
  razon_social?: string;

  @IsOptional()
  @IsString({ message: 'nombre_comercial debe ser texto' })
  @MaxLength(200, { message: 'nombre_comercial no puede exceder 200 caracteres' })
  nombre_comercial?: string;

  @IsOptional()
  @IsString({ message: 'representante_legal debe ser texto' })
  @MaxLength(200, { message: 'representante_legal no puede exceder 200 caracteres' })
  representante_legal?: string;

  @IsOptional()
  @IsString({ message: 'cedula_representante debe ser texto' })
  @MaxLength(20, { message: 'cedula_representante no puede exceder 20 caracteres' })
  cedula_representante?: string;

  // 🟢 CONTACTO
  @IsOptional()
  @IsEmail({}, { message: 'email_principal debe ser un email válido' })
  @MaxLength(150, { message: 'email_principal no puede exceder 150 caracteres' })
  email_principal?: string;

  @IsOptional()
  @IsString({ message: 'telefono_principal debe ser texto' })
  @MaxLength(20, { message: 'telefono_principal no puede exceder 20 caracteres' })
  telefono_principal?: string;

  @IsOptional()
  @IsString({ message: 'telefono_secundario debe ser texto' })
  @MaxLength(20, { message: 'telefono_secundario no puede exceder 20 caracteres' })
  telefono_secundario?: string;

  @IsOptional()
  @IsString({ message: 'celular debe ser texto' })
  @MaxLength(20, { message: 'celular no puede exceder 20 caracteres' })
  celular?: string;

  // 🟢 UBICACIÓN (defaults: CARTAGENA, BOLÍVAR, COLOMBIA)
  @IsOptional()
  @IsString({ message: 'direccion_principal debe ser texto' })
  @MaxLength(300, { message: 'direccion_principal no puede exceder 300 caracteres' })
  direccion_principal?: string;

  @IsOptional()
  @IsString({ message: 'barrio_zona debe ser texto' })
  @MaxLength(100, { message: 'barrio_zona no puede exceder 100 caracteres' })
  barrio_zona?: string;

  @IsOptional()
  @IsString({ message: 'ciudad debe ser texto' })
  @MaxLength(100, { message: 'ciudad no puede exceder 100 caracteres' })
  ciudad?: string;

  @IsOptional()
  @IsString({ message: 'departamento debe ser texto' })
  @MaxLength(100, { message: 'departamento no puede exceder 100 caracteres' })
  departamento?: string;

  @IsOptional()
  @IsString({ message: 'pais debe ser texto' })
  @MaxLength(100, { message: 'pais no puede exceder 100 caracteres' })
  pais?: string;

  // 🟢 OTROS
  @IsOptional()
  @IsDateString({}, { message: 'fecha_nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  fecha_nacimiento?: string;

  @IsOptional()
  @IsBoolean({ message: 'es_cliente debe ser boolean' })
  es_cliente?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'es_proveedor debe ser boolean' })
  es_proveedor?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'es_empleado debe ser boolean' })
  es_empleado?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'es_contratista debe ser boolean' })
  es_contratista?: boolean;

  @IsOptional()
  @IsString({ message: 'ruta_foto debe ser texto' })
  @MaxLength(500, { message: 'ruta_foto no puede exceder 500 caracteres' })
  ruta_foto?: string;

  @IsOptional()
  @IsString({ message: 'observaciones debe ser texto' })
  observaciones?: string;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser boolean' })
  activo?: boolean;

  // ⚠️ NOTA: nombre_completo se genera automáticamente por DB (computed field)
  // ⚠️ NOTA: creado_por se extrae del JWT en el controller (@CurrentUser)
}
