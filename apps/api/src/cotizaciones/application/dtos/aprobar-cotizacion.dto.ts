import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AprobarCotizacionDto {
  @ApiPropertyOptional({
    description: 'Observaciones de aprobación del cliente',
    example: 'Cliente aprobó condiciones de pago 30 días vía correo corporativo',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'Número de Orden de Compra (PO) emitida por el cliente',
    example: 'OC-2026-88412',
  })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  orden_compra_cliente?: string;
}
