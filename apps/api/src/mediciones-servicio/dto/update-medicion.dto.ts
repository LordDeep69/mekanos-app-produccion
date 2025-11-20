import { PartialType } from '@nestjs/mapped-types';
import { CreateMedicionDto } from './create-medicion.dto';
import { IsInt } from 'class-validator'; // ✅ FIX: Removed unused IsOptional

/**
 * DTO para actualizar medición de servicio
 * FASE 4.2 - Todos los campos opcionales excepto ID
 */

export class UpdateMedicionDto extends PartialType(CreateMedicionDto) {
  @IsInt()
  id_medicion!: number;

  // Heredados de PartialType (todos @IsOptional()):
  // - valor_numerico
  // - valor_texto
  // - unidad_medida
  // - observaciones
  // - temperatura_ambiente
  // - humedad_relativa
  // - fecha_medicion
  // - instrumento_medicion

  // ⚠️ NO se pueden actualizar manualmente:
  // - id_orden_servicio (inmutable)
  // - id_parametro_medicion (inmutable)
  // - fuera_de_rango (recalculado automáticamente)
  // - nivel_alerta (recalculado automáticamente)
  // - medido_por (JWT)
}
