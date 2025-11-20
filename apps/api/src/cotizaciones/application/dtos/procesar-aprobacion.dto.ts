import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class ProcesarAprobacionDto {
  @ApiProperty({
    description: 'Decisión aprobación',
    enum: ['APROBADA', 'RECHAZADA'],
    example: 'APROBADA',
  })
  @IsEnum(['APROBADA', 'RECHAZADA'], { message: 'Decisión debe ser APROBADA o RECHAZADA' })
  decision!: 'APROBADA' | 'RECHAZADA';

  @ApiProperty({
    description: 'Observaciones aprobador (obligatorio)',
    example: 'Aprobado condiciones comerciales. Descuento 20% justificado por volumen compra cliente.',
  })
  @IsString()
  @MinLength(10, { message: 'Observaciones aprobador mínimo 10 caracteres' })
  observaciones_aprobador!: string;
}
