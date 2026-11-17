import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en remisiones.
 */
export class CreateRemisionesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_remision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_remision?: string;

  @ApiProperty({ enum: ["TECNICO","CLIENTE","PROVEEDOR","OTRO"] })
  @IsIn(["TECNICO","CLIENTE","PROVEEDOR","OTRO"])
  tipo_destino!: "TECNICO" | "CLIENTE" | "PROVEEDOR" | "OTRO";

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_destino!: number;

  @ApiProperty()
  @IsString()
  nombre_destinatario!: string;

  @ApiProperty({ enum: ["VALE_SALIDA_TECNICO","VENTA_CLIENTE","PRESTAMO_HERRAMIENTA","GARANTIA"] })
  @IsIn(["VALE_SALIDA_TECNICO","VENTA_CLIENTE","PRESTAMO_HERRAMIENTA","GARANTIA"])
  tipo_remision!: "VALE_SALIDA_TECNICO" | "VENTA_CLIENTE" | "PRESTAMO_HERRAMIENTA" | "GARANTIA";

  @ApiProperty()
  @IsBoolean()
  requiere_devolucion!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_devolucion_esperada?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_devolucion_real?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_orden_servicio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_cotizacion?: number;

  @ApiPropertyOptional({ enum: ["ABIERTA","CERRADA","VENCIDA","CANCELADA"] })
  @IsOptional()
  @IsIn(["ABIERTA","CERRADA","VENCIDA","CANCELADA"])
  estado_remision?: "ABIERTA" | "CERRADA" | "VENCIDA" | "CANCELADA";

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_cierre?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  entregado_por!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recibido_por?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firma_digital_recepcion?: string;
}
