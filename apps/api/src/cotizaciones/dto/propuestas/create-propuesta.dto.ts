import { IsEnum, IsInt, IsPositive, IsString, Max, Min, MinLength } from 'class-validator';

/**
 * CreatePropuestaDto
 * FASE 4.9: DTO crear propuesta correctivo
 */

export enum TipoPropuesta {
  CORRECTIVO = 'CORRECTIVO',
  MEJORA = 'MEJORA',
  REEMPLAZO = 'REEMPLAZO',
}

export enum UrgenciaPropuesta {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

export class CreatePropuestaDto {
  @IsInt()
  @IsPositive()
  id_orden_servicio!: number;

  @IsEnum(TipoPropuesta)
  tipo_propuesta!: TipoPropuesta;

  @IsString()
  @MinLength(20, { message: 'Descripción hallazgo debe tener mínimo 20 caracteres' })
  descripcion_hallazgo!: string;

  @IsString()
  @MinLength(20, { message: 'Descripción solución debe tener mínimo 20 caracteres' })
  descripcion_solucion!: string;

  @IsEnum(UrgenciaPropuesta)
  urgencia_propuesta!: UrgenciaPropuesta;

  @IsInt()
  @Min(1)
  @Max(5)
  prioridad!: number;

  @IsInt()
  @IsPositive()
  tiempo_estimado_ejecucion!: number; // días

  @IsInt()
  @IsPositive()
  creada_por!: number; // ID técnico
}
