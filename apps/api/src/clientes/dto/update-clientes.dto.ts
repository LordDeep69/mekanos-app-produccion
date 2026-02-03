import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import {
    PeriodicidadMantenimientoEnum,
    TipoClienteEnum,
} from './create-clientes.dto';

/**
 * DTO para actualizar solo campos de contacto de persona
 * ✅ FIX 03-FEB-2026: Sin campos obligatorios (tipo_identificacion, numero_identificacion)
 */
export class UpdatePersonaContactoDto {
    @IsOptional()
    @IsEmail()
    email_principal?: string;

    @IsOptional()
    @IsString()
    telefono_principal?: string;

    @IsOptional()
    @IsString()
    celular?: string;

    @IsOptional()
    @IsString()
    direccion_principal?: string;

    @IsOptional()
    @IsString()
    ciudad?: string;

    @IsOptional()
    @IsString()
    departamento?: string;
}

/**
 * DTO para actualizar cliente
 * ✅ FIX 03-FEB-2026: DTO independiente (no hereda de CreateClientesDto)
 * para evitar validaciones anidadas de persona
 */
export class UpdateClientesDto {
    @IsOptional()
    @IsEnum(TipoClienteEnum)
    tipo_cliente?: TipoClienteEnum;

    @IsOptional()
    @IsEnum(PeriodicidadMantenimientoEnum)
    periodicidad_mantenimiento?: PeriodicidadMantenimientoEnum;

    @IsOptional()
    @IsInt()
    id_firma_administrativa?: number;

    @IsOptional()
    @IsInt()
    id_asesor_asignado?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(100)
    descuento_autorizado?: number;

    @IsOptional()
    @IsBoolean()
    tiene_credito?: boolean;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    limite_credito?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    dias_credito?: number;

    @IsOptional()
    @IsBoolean()
    cliente_activo?: boolean;

    @IsOptional()
    @IsBoolean()
    tiene_acceso_portal?: boolean;

    @IsOptional()
    @IsString()
    observaciones_servicio?: string;

    @IsOptional()
    @IsString()
    requisitos_especiales?: string;

    // ✅ Persona con solo campos de contacto editables
    @IsOptional()
    @ValidateNested()
    @Type(() => UpdatePersonaContactoDto)
    persona?: UpdatePersonaContactoDto;
}
