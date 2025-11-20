import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AprobarCotizacionDto {
  @ApiProperty({
    description: 'Observaciones aprobación (opcional)',
    example: 'Cliente aprobó condiciones de pago 60 días',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  observaciones?: string;
}
