import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SolicitarAprobacionDto {
  @ApiPropertyOptional({
    description: 'Observaciones opcionales del solicitante para el historial o aprobador',
    example: 'Aprobada con condiciones comerciales validadas',
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto válido' })
  @MaxLength(1000, { message: 'Las observaciones no pueden superar los 1000 caracteres' })
  observaciones_solicitante?: string;
}
