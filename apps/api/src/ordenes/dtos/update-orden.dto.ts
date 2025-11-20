import { 
  IsInt, 
  IsString, 
  IsOptional, 
  IsDateString, 
  IsEnum, 
  IsBoolean, 
  MaxLength,
} from 'class-validator';

/**
 * DTO: Actualizar orden de servicio existente
 */
export class UpdateOrdenDto {
  @IsInt()
  @IsOptional()
  id_sede?: number;

  @IsInt()
  @IsOptional()
  id_tipo_servicio?: number;

  @IsDateString()
  @IsOptional()
  fecha_programada?: string;

  @IsString()
  @IsOptional()
  hora_programada?: string;

  @IsEnum(['NORMAL', 'ALTA', 'URGENTE', 'EMERGENCIA'])
  @IsOptional()
  prioridad?: string;

  @IsEnum(['PROGRAMADO', 'CLIENTE', 'INTERNO', 'EMERGENCIA', 'GARANTIA'])
  @IsOptional()
  origen_solicitud?: string;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  descripcion_inicial?: string;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  trabajo_realizado?: string;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  observaciones_tecnico?: string;

  @IsBoolean()
  @IsOptional()
  requiere_firma_cliente?: boolean;
}
