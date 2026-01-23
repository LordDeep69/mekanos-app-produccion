/**
 * DTOs para cambio de estado y lectura de horómetro de equipos
 * ✅ 08-ENE-2026: Creado para módulo de equipos del Admin Portal
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export enum EstadoEquipoEnum {
    OPERATIVO = 'OPERATIVO',
    STANDBY = 'STANDBY',
    INACTIVO = 'INACTIVO',
    EN_REPARACION = 'EN_REPARACION',
    FUERA_SERVICIO = 'FUERA_SERVICIO',
    BAJA = 'BAJA',
}

export class CambiarEstadoEquipoDto {
    @ApiProperty({
        description: 'Nuevo estado del equipo',
        enum: EstadoEquipoEnum,
        example: 'EN_REPARACION',
    })
    @IsNotEmpty({ message: 'El nuevo estado es requerido' })
    @IsEnum(EstadoEquipoEnum, { message: 'Estado no válido' })
    nuevo_estado: EstadoEquipoEnum;

    @ApiPropertyOptional({
        description: 'Motivo del cambio de estado',
        example: 'Equipo requiere mantenimiento correctivo por falla en sistema de refrigeración',
    })
    @IsOptional()
    @IsString({ message: 'El motivo debe ser una cadena de texto' })
    motivo_cambio?: string;
}

export class RegistrarLecturaHorometroDto {
    @ApiProperty({
        description: 'Horas de lectura del horómetro',
        example: 1234.5,
        minimum: 0,
    })
    @IsNotEmpty({ message: 'Las horas de lectura son requeridas' })
    @IsNumber({}, { message: 'Las horas deben ser un número' })
    @Min(0, { message: 'Las horas no pueden ser negativas' })
    @Max(999999.99, { message: 'Las horas exceden el máximo permitido' })
    horas_lectura: number;

    @ApiPropertyOptional({
        description: 'Observaciones sobre la lectura',
        example: 'Lectura tomada durante mantenimiento preventivo Tipo A',
    })
    @IsOptional()
    @IsString({ message: 'Las observaciones deben ser una cadena de texto' })
    observaciones?: string;

    @ApiPropertyOptional({
        description: 'Tipo de lectura',
        example: 'MANTENIMIENTO',
    })
    @IsOptional()
    @IsString()
    tipo_lectura?: string;
}
