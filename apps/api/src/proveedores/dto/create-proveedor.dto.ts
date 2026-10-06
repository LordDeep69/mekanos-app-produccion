import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';

enum TipoProveedorEnum {
  NACIONAL = 'NACIONAL',
  INTERNACIONAL = 'INTERNACIONAL',
}

enum CategoriaProveedorEnum {
  REPUESTOS = 'REPUESTOS',
  SERVICIOS = 'SERVICIOS',
  CONTRATISTA = 'CONTRATISTA',
  SUMINISTROS = 'SUMINISTROS',
  EQUIPOS = 'EQUIPOS',
  MIXTO = 'MIXTO',
}

/**
 * DTO para crear proveedores con validaciones completas
 * Sesión 22 - FASE 2 Activación de módulos prerequisitos
 */
export class CrearProveedorDto {
  @IsInt({ message: 'id_persona debe ser un número entero' })
  @IsPositive({ message: 'id_persona debe ser positivo' })
  @IsOptional()
  id_persona?: number;

  @IsString()
  @IsOptional()
  codigo_proveedor?: string;

  @IsString()
  @IsOptional()
  razon_social?: string;

  @IsString()
  @IsOptional()
  nombre_comercial?: string;

  @IsString()
  @IsOptional()
  tipo_identificacion?: string;

  @IsString()
  @IsOptional()
  numero_identificacion?: string;

  @IsString()
  @IsOptional()
  email_principal?: string;

  @IsString()
  @IsOptional()
  telefono_principal?: string;

  @IsString()
  @IsOptional()
  direccion_principal?: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsEnum(CategoriaProveedorEnum, { message: 'categoria_proveedor debe ser un valor válido' })
  @IsOptional()
  categoria_proveedor?: CategoriaProveedorEnum;

  @IsEnum(TipoProveedorEnum, { message: 'tipo_proveedor debe ser NACIONAL o INTERNACIONAL' })
  @IsOptional()
  tipo_proveedor?: TipoProveedorEnum;

  @IsBoolean({ message: 'responsable_iva debe ser booleano' })
  @IsOptional()
  responsable_iva?: boolean;

  @IsInt({ message: 'tiempo_entrega_dias debe ser un número entero' })
  @IsPositive({ message: 'tiempo_entrega_dias debe ser positivo' })
  @IsOptional()
  tiempo_entrega_dias?: number;

  @IsString({ message: 'servicios_ofrecidos debe ser texto' })
  @IsOptional()
  servicios_ofrecidos?: string;

  @IsBoolean({ message: 'realiza_entregas debe ser booleano' })
  @IsOptional()
  realiza_entregas?: boolean;

  @IsString({ message: 'zona_cobertura debe ser texto' })
  @MaxLength(500, { message: 'zona_cobertura no puede exceder 500 caracteres' })
  @IsOptional()
  zona_cobertura?: string;

  @IsBoolean({ message: 'proveedor_activo debe ser booleano' })
  @IsOptional()
  proveedor_activo?: boolean;

  @IsString({ message: 'observaciones debe ser texto' })
  @IsOptional()
  observaciones?: string;

  @IsString()
  @IsOptional()
  persona_contacto?: string;

  @IsString()
  @IsOptional()
  email_facturacion?: string;

  @IsString()
  @IsOptional()
  sitio_web?: string;

  @IsString()
  @IsOptional()
  url_ubicacion?: string;

  @IsString()
  @IsOptional()
  terminos_credito?: string;

  @IsString()
  @IsOptional()
  observaciones_despacho?: string;

  @IsString()
  @IsOptional()
  etiquetas_secundarias?: string;

  @IsOptional()
  rubros?: string[] | string;
}
