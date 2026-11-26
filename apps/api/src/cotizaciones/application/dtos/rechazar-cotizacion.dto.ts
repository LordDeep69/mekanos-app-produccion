import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class RechazarCotizacionDto {
  @ApiProperty({
    description: 'ID motivo rechazo (tabla motivos_rechazo)',
    example: 1,
  })
  @IsInt({ message: 'Debes seleccionar un motivo de rechazo válido' })
  id_motivo_rechazo!: number;

  @ApiPropertyOptional({
    description: 'Detalle o retroalimentación del rechazo',
    example: 'Precio superior al presupuesto disponible',
  })
  @IsOptional()
  @IsString({ message: 'El detalle de rechazo debe ser texto válido' })
  @MaxLength(1000, { message: 'El detalle de rechazo no puede superar los 1000 caracteres' })
  observaciones_rechazo?: string;
}
