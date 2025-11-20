import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SolicitarAprobacionDto {
  @ApiProperty({
    description: 'Observaciones del solicitante (obligatorio)',
    example: 'Cliente corporativo, descuento excepcional aprobado verbalmente por gerencia',
  })
  @IsString()
  @MinLength(10, { message: 'Observaciones solicitante mínimo 10 caracteres' })
  observaciones_solicitante!: string;
}
