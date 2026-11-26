import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProcesarAprobacionDto {
  @ApiProperty({
    description: 'Decisión aprobación',
    enum: ['APROBADA', 'RECHAZADA'],
    example: 'APROBADA',
  })
  @IsEnum(['APROBADA', 'RECHAZADA'], { message: 'Decisión debe ser APROBADA o RECHAZADA' })
  decision!: 'APROBADA' | 'RECHAZADA';

  @ApiPropertyOptional({
    description: 'Observaciones opcionales del aprobador',
    example: 'Aprobado condiciones comerciales.',
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones del aprobador deben ser texto válido' })
  @MaxLength(1000, { message: 'Las observaciones no pueden superar los 1000 caracteres' })
  observaciones_aprobador?: string;
}
