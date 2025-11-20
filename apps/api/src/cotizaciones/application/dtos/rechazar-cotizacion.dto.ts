import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MinLength } from 'class-validator';

export class RechazarCotizacionDto {
  @ApiProperty({
    description: 'ID motivo rechazo (tabla motivos_rechazo)',
    example: 1,
  })
  @IsInt({ message: 'ID motivo rechazo debe ser entero' })
  id_motivo_rechazo!: number;

  @ApiProperty({
    description: 'Observaciones rechazo (obligatorio)',
    example: 'Cliente considera precio 15% superior al presupuesto disponible',
  })
  @IsString()
  @MinLength(10, { message: 'Observaciones rechazo mínimo 10 caracteres' })
  observaciones_rechazo!: string;
}
