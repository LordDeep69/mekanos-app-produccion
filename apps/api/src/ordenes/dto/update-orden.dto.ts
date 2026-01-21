import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO para actualizar orden de servicio
 * 
 * Solo se pueden editar órdenes en estados NO finales (APROBADA, CANCELADA)
 * El handler valida esto antes de aplicar cambios.
 */
export class UpdateOrdenDto {
    @ApiPropertyOptional({ description: 'ID de la sede cliente' })
    @IsOptional()
    @IsInt()
    id_sede?: number;

    @ApiPropertyOptional({ description: 'ID del tipo de servicio' })
    @IsOptional()
    @IsInt()
    id_tipo_servicio?: number;

    @ApiPropertyOptional({ description: 'Fecha programada (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    fecha_programada?: string;

    @ApiPropertyOptional({ description: 'Hora programada (HH:mm)' })
    @IsOptional()
    @IsString()
    hora_programada?: string;

    @ApiPropertyOptional({
        description: 'Prioridad de la orden',
        enum: ['NORMAL', 'ALTA', 'URGENTE', 'EMERGENCIA']
    })
    @IsOptional()
    @IsEnum(['NORMAL', 'ALTA', 'URGENTE', 'EMERGENCIA'])
    prioridad?: string;

    @ApiPropertyOptional({
        description: 'Origen de la solicitud',
        enum: ['PROGRAMADO', 'CLIENTE', 'INTERNO', 'EMERGENCIA', 'GARANTIA']
    })
    @IsOptional()
    @IsEnum(['PROGRAMADO', 'CLIENTE', 'INTERNO', 'EMERGENCIA', 'GARANTIA'])
    origen_solicitud?: string;

    @ApiPropertyOptional({ description: 'Descripción inicial del trabajo' })
    @IsOptional()
    @IsString()
    descripcion_inicial?: string;

    @ApiPropertyOptional({ description: 'Trabajo realizado (post-ejecución)' })
    @IsOptional()
    @IsString()
    trabajo_realizado?: string;

    @ApiPropertyOptional({ description: 'Observaciones del técnico' })
    @IsOptional()
    @IsString()
    observaciones_tecnico?: string;

    @ApiPropertyOptional({ description: 'Requiere firma del cliente' })
    @IsOptional()
    @IsBoolean()
    requiere_firma_cliente?: boolean;
}
