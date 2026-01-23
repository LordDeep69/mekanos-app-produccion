import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { TipoEvidenciaEnum } from '../application/enums/tipo-evidencia.enum';

/**
 * DTO para subir evidencia fotográfica desde Admin Portal
 * 
 * A diferencia de CreateEvidenciaDto (que espera URL de Cloudinary),
 * este DTO recibe el Base64 de la imagen y el backend se encarga de:
 * 1. Subir a Cloudinary
 * 2. Calcular hash SHA256
 * 3. Registrar en BD
 */
export class UploadBase64Dto {
    @ApiProperty({ description: 'ID orden servicio (FK)', example: 635 })
    @IsInt()
    idOrdenServicio!: number;

    @ApiPropertyOptional({ description: 'ID actividad ejecutada (FK)', example: 3992 })
    @IsOptional()
    @IsInt()
    idActividadEjecutada?: number;

    @ApiProperty({
        enum: TipoEvidenciaEnum,
        description: 'Tipo evidencia (ANTES, DURANTE, DESPUES, etc.)',
        example: 'ANTES'
    })
    @IsEnum(TipoEvidenciaEnum)
    tipoEvidencia!: TipoEvidenciaEnum;

    @ApiPropertyOptional({ description: 'Descripción de la evidencia', maxLength: 500, example: 'LIMPIEZA Y AJUSTE DE BORNES' })
    @IsOptional()
    @MaxLength(500)
    descripcion?: string;

    @ApiPropertyOptional({ description: 'Nombre del archivo original', maxLength: 255, example: 'foto_antes.jpg' })
    @IsOptional()
    @MaxLength(255)
    nombreArchivo?: string;

    @ApiProperty({
        description: 'Imagen en formato Base64 (con o sin prefijo data:image/...)',
        example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
    })
    @IsString()
    base64!: string;
}
