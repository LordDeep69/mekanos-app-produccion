import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';

export enum OrigenActividadPlan {
    ADMIN = 'ADMIN',
    MOVIL = 'MOVIL',
}

export class AddActividadPlanDto {
    @ApiProperty({ example: 1, description: 'ID de la actividad en el catálogo' })
    @IsInt()
    idActividadCatalogo: number;

    @ApiProperty({ example: 1, description: 'Orden de secuencia en la lista', required: false })
    @IsOptional()
    @IsInt()
    ordenSecuencia?: number;

    @ApiProperty({ example: true, description: 'Si la actividad es obligatoria', required: false })
    @IsOptional()
    @IsBoolean()
    esObligatoria?: boolean;

    @ApiProperty({ enum: OrigenActividadPlan, example: OrigenActividadPlan.ADMIN, required: false })
    @IsOptional()
    @IsEnum(OrigenActividadPlan)
    origen?: OrigenActividadPlan;
}

export class UpdateActividadPlanDto {
    @ApiProperty({ example: 1, description: 'Orden de secuencia en la lista', required: false })
    @IsOptional()
    @IsInt()
    ordenSecuencia?: number;

    @ApiProperty({ example: true, description: 'Si la actividad es obligatoria', required: false })
    @IsOptional()
    @IsBoolean()
    esObligatoria?: boolean;
}
