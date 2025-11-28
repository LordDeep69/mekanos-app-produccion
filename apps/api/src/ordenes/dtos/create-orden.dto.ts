import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min
} from 'class-validator';

/**
 * DTO: Crear nueva orden de servicio
 * NOTA: Usa camelCase para alinear con Command y Controller
 */
export class CreateOrdenDto {
  @IsInt()
  @Min(1)
  equipoId!: number;

  @IsInt()
  @Min(1)
  clienteId!: number;

  @IsInt()
  @Min(1)
  tipoServicioId!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  sedeClienteId?: number;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  descripcion?: string;

  @IsEnum(['NORMAL', 'ALTA', 'URGENTE', 'EMERGENCIA'])
  @IsOptional()
  prioridad?: string;

  @IsDateString()
  @IsOptional()
  fechaProgramada?: string;
}
