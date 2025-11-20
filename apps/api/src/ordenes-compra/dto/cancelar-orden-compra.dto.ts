import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CancelarOrdenCompraDto {
  @ApiProperty({ description: 'Motivo de cancelación', example: 'Proveedor no puede cumplir con fechas' })
  @IsString()
  motivo_cancelacion!: string;
}
