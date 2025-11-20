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
  @IsNotEmpty({ message: 'id_persona es requerido' })
  id_persona!: number;

  @IsEnum(CategoriaProveedorEnum, { message: 'categoria_proveedor debe ser un valor válido' })
  @IsNotEmpty({ message: 'categoria_proveedor es requerida' })
  categoria_proveedor!: CategoriaProveedorEnum;

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
}
