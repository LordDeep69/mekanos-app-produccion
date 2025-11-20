import { 
  IsInt, 
  IsString, 
  IsOptional, 
  IsDateString, 
  IsEnum, 
  IsBoolean, 
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO: Crear nueva orden de servicio
 */
export class CreateOrdenDto {
  @IsString()
  @MinLength(5)
  @MaxLength(50)
  numero_orden: string;

  @IsInt()
  id_cliente: number;

  @IsInt()
  id_equipo: number;

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
  hora_programada?: string; // Format: "HH:MM:SS"

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

  @IsBoolean()
  @IsOptional()
  requiere_firma_cliente?: boolean;
}
